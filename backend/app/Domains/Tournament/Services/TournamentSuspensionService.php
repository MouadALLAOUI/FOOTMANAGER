<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Enums\RoundStage;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchEventType;
use App\Domains\Match\Enums\MatchPunishment;
use App\Domains\Match\Models\MatchEvent;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use Illuminate\Support\Collection;

/**
 * Computes player suspensions derived from card accumulation within a
 * tournament according to three distinct disciplinary rules:
 *
 *  - RULE A: Tournament-long suspension (explicit committee ruling; applies to
 *            all matches; qualification/card reset never cancels it).
 *  - RULE B: One-match suspension (from red card, second yellow, or 2 yellows;
 *            must be served in next eligible match; qualification/reset never cancels it).
 *  - RULE C: Yellow-card accumulation reset (when a team qualifies for knockout,
 *            its yellow counter resets to 0 while preserving pending suspensions,
 *            red-card history, and historical event records).
 */
class TournamentSuspensionService
{
    /**
     * @return array<int, array{player_id: int, player_name: string|null, team_id: int, reason: string, type: string}>
     */
    public function suspendedFor(Fixture $fixture): array
    {
        $tournament = $this->tournamentFor($fixture);

        $suspended = [];

        // Check Rule A: Tournament-long suspensions for both participating teams
        $tournamentLong = collect(($tournament->plan ?? [])['disciplinary']['tournament_long_suspensions'] ?? []);
        $teamIds = array_filter([(int) $fixture->home_team_id, (int) $fixture->away_team_id]);

        foreach ($tournamentLong as $tl) {
            if (in_array((int) ($tl['team_id'] ?? 0), $teamIds, true)) {
                $suspended[] = [
                    'player_id' => (int) $tl['player_id'],
                    'player_name' => $tl['player_name'] ?? null,
                    'team_id' => (int) $tl['team_id'],
                    'type' => 'tournament_long',
                    'reason' => 'إيقاف لكامل البطولة: ' . ($tl['reason'] ?? 'قرار انضباطي'),
                ];
            }
        }

        if (! $tournament->cardAccumulationEnabled()) {
            return $suspended;
        }

        foreach ($teamIds as $teamId) {
            $simulated = $this->simulateTeam(
                $tournament,
                $teamId,
                $fixture,
                $tournament->accumulatesAcrossGroupStageOnly(),
            );

            foreach ($simulated as $entry) {
                // Do not duplicate if already under tournament-long suspension
                if (! collect($suspended)->contains('player_id', $entry['player_id'])) {
                    $suspended[] = $entry;
                }
            }
        }

        return $suspended;
    }

    public function playerIsSuspended(Fixture $fixture, int $playerId): bool
    {
        foreach ($this->suspendedFor($fixture) as $entry) {
            if ((int) $entry['player_id'] === $playerId) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<int, array{player_id: int, player_name: string|null, team_id: int, reason: string, type: string}>
     */
    private function simulateTeam(Tournament $tournament, int $teamId, Fixture $target, bool $groupOnly): array
    {
        $fixtures = $this->teamFixtures($tournament, $teamId);

        $eventsByMatch = $this->cardEventsByMatch($tournament, $fixtures, $teamId);

        $playerIds = $eventsByMatch->flatten()->pluck('player_id')->unique()->values();
        $names = $playerIds->isNotEmpty()
            ? Player::query()->whereKey($playerIds->all())->pluck('name', 'id')
            : collect();

        $targetId = (int) $target->id;

        $state = collect();
        $suspended = [];
        $inGroupStage = true;

        foreach ($fixtures as $fixture) {
            $isGroup = $this->isGroupFixture($fixture);
            $isTarget = (int) $fixture->id === $targetId;

            // RULE C: When crossing from group stage to knockout stage,
            // reset accumulated yellow count to 0, but PRESERVE pending suspensions (Rule B)!
            if ($groupOnly && ! $isGroup && $inGroupStage) {
                $state = $state->map(function ($playerState) {
                    $playerState['yellows'] = 0;
                    return $playerState;
                });
                $inGroupStage = false;
            }

            $playable = ! in_array($fixture->status?->value, [
                FixtureStatus::Cancelled->value,
                FixtureStatus::Postponed->value,
            ], true);

            $matchEvents = $eventsByMatch->get((int) $fixture->match_id, collect());

            $playerIdsHere = $state->keys()
                ->concat($matchEvents->pluck('player_id'))
                ->unique()
                ->values();

            foreach ($playerIdsHere as $playerId) {
                $playerState = $state->get($playerId, ['yellows' => 0, 'pending' => null]);

                // Check pending suspension (Rule B: One-match suspension)
                if ($playerState['pending'] !== null) {
                    if (! $playable) {
                        $state->put($playerId, $playerState);
                        continue;
                    }

                    if ($isTarget) {
                        $suspended[] = [
                            'player_id' => $playerId,
                            'player_name' => $names->get($playerId),
                            'team_id' => $teamId,
                            'type' => 'one_match',
                            'reason' => match ($playerState['pending']) {
                                MatchEventType::RedCard->value => 'إيقاف لمباراة واحدة (بطاقة حمراء مباشرة)',
                                MatchEventType::SecondYellow->value => 'إيقاف لمباراة واحدة (إنذار ثانٍ / طرد)',
                                'two_yellows' => 'إيقاف لمباراة واحدة (تراكم بطاقتين صفراوين)',
                                default => 'إيقاف لمباراة واحدة (' . $playerState['pending'] . ')',
                            },
                        ];
                    }

                    // Once this playable fixture is processed, the one-match suspension is served
                    $playerState = ['yellows' => 0, 'pending' => null];
                }

                $playerEvents = $matchEvents->where('player_id', $playerId);

                $dismissed = $playerEvents->contains(fn (MatchEvent $event) => $this->isDismissal($event));

                if ($dismissed) {
                    $dismissal = $playerEvents->first(fn (MatchEvent $event) => $this->isDismissal($event));

                    $playerState = [
                        'yellows' => 0,
                        'pending' => $this->isSecondYellow($dismissal)
                            ? MatchEventType::SecondYellow->value
                            : MatchEventType::RedCard->value,
                    ];
                } else {
                    $playerState['yellows'] += $playerEvents
                        ->filter(fn (MatchEvent $event) => $this->isYellow($event))
                        ->count();

                    if ($playerState['yellows'] >= 2 && $playerState['pending'] === null) {
                        $playerState['pending'] = 'two_yellows';
                    }
                }

                $state->put($playerId, $playerState);
            }
        }

        return $suspended;
    }

    /**
     * Comprehensive tournament disciplinary administration overview.
     *
     * @return array{
     *   tournament_id: int,
     *   records: array<int, array<string, mixed>>,
     *   summary: array{total_players_disciplined: int, active_suspensions: int, tournament_long_count: int}
     * }
     */
    public function tournamentDisciplinarySummary(Tournament $tournament): array
    {
        $competitionId = $tournament->competition_id;
        $seasonId = $tournament->season_id;

        $fixtures = Fixture::query()
            ->with(['round', 'match'])
            ->where('competition_id', $competitionId)
            ->where('season_id', $seasonId)
            ->get();

        $matchIds = $fixtures->pluck('match_id')->filter()->values();

        $events = MatchEvent::query()
            ->whereIn('match_id', $matchIds)
            ->where(function ($query) {
                $query->whereIn('type', [
                    MatchEventType::YellowCard->value,
                    MatchEventType::SecondYellow->value,
                    MatchEventType::RedCard->value,
                ])->orWhere(function ($q) {
                    $q->where('type', MatchEventType::Foul->value)
                        ->whereIn('punishment', [
                            MatchPunishment::Yellow->value,
                            MatchPunishment::SecondYellow->value,
                            MatchPunishment::Red->value,
                        ]);
                });
            })
            ->get();

        $tournamentLong = collect(($tournament->plan ?? [])['disciplinary']['tournament_long_suspensions'] ?? []);
        $tlPlayerIds = $tournamentLong->pluck('player_id')->all();

        $playerIds = $events->pluck('player_id')->concat($tlPlayerIds)->unique()->filter()->values();

        $players = Player::query()
            ->with('team')
            ->whereKey($playerIds)
            ->get()
            ->keyBy('id');

        $upcomingFixture = $fixtures->firstWhere('status', FixtureStatus::Scheduled->value)
            ?? $fixtures->sortByDesc('id')->first();

        $activeSuspendedMap = [];
        if ($upcomingFixture) {
            foreach ($this->suspendedFor($upcomingFixture) as $susp) {
                $activeSuspendedMap[$susp['player_id']] = $susp;
            }
        }

        $records = [];
        $groupRoundId = $fixtures->first(fn ($f) => $this->isGroupFixture($f))?->round_id;

        foreach ($playerIds as $playerId) {
            $player = $players->get($playerId);
            if (! $player) {
                continue;
            }

            $playerEvents = $events->where('player_id', $playerId);

            $groupYellows = $playerEvents
                ->filter(fn ($e) => ($this->isYellow($e)) && in_array($e->match_id, $fixtures->where('round_id', $groupRoundId)->pluck('match_id')->all()))
                ->count();

            $knockoutYellows = $playerEvents
                ->filter(fn ($e) => ($this->isYellow($e)) && ! in_array($e->match_id, $fixtures->where('round_id', $groupRoundId)->pluck('match_id')->all()))
                ->count();

            $directReds = $playerEvents
                ->filter(fn ($e) => ($e->type === MatchEventType::RedCard->value || ($e->type === MatchEventType::Foul->value && $e->punishment === MatchPunishment::Red)))
                ->count();

            $secondYellows = $playerEvents
                ->filter(fn ($e) => $this->isSecondYellow($e))
                ->count();

            $tlRecord = $tournamentLong->firstWhere('player_id', (int) $playerId);
            $activeSusp = $activeSuspendedMap[$playerId] ?? null;

            $suspensionType = null;
            $suspensionReason = null;
            $status = 'none';
            $eligibility = 'مؤهل للمشاركة';

            if ($tlRecord) {
                $suspensionType = 'tournament_long';
                $suspensionReason = $tlRecord['reason'] ?? 'إيقاف لكامل البطولة بقرار تأديبي';
                $status = 'active';
                $eligibility = 'موقوف لكامل البطولة ⛔';
            } elseif ($activeSusp) {
                $suspensionType = 'one_match';
                $suspensionReason = $activeSusp['reason'];
                $status = 'active';
                $eligibility = 'موقوف لمباراة واحدة ⚠️';
            }

            $records[] = [
                'player_id' => $player->id,
                'player_name' => $player->name,
                'team_id' => $player->team_id,
                'team_name' => $player->team?->name ?? 'غير محدد',
                'team_logo' => $player->team?->logo_url,
                'group_yellow_cards' => $groupYellows,
                'knockout_yellow_cards' => $knockoutYellows,
                'second_yellow_cards' => $secondYellows,
                'direct_red_cards' => $directReds,
                'total_cards' => $groupYellows + $knockoutYellows + $secondYellows + $directReds,
                'suspension_type' => $suspensionType,
                'suspension_reason' => $suspensionReason,
                'suspension_status' => $status,
                'is_eligible' => $status !== 'active',
                'eligibility_label' => $eligibility,
            ];
        }

        // Sort: active suspended first, then by total cards
        usort($records, function ($a, $b) {
            if ($a['is_eligible'] !== $b['is_eligible']) {
                return $a['is_eligible'] ? 1 : -1;
            }
            return $b['total_cards'] <=> $a['total_cards'];
        });

        return [
            'tournament_id' => $tournament->id,
            'records' => $records,
            'summary' => [
                'total_players_disciplined' => count($records),
                'active_suspensions' => count(array_filter($records, fn ($r) => ! $r['is_eligible'])),
                'tournament_long_count' => $tournamentLong->count(),
            ],
        ];
    }

    /**
     * Issue an explicit tournament-long suspension for serious misconduct (Rule A).
     */
    public function issueTournamentLongSuspension(Tournament $tournament, int $playerId, string $reason, int $issuedBy): array
    {
        $player = Player::query()->with('team')->findOrFail($playerId);

        $plan = $tournament->plan ?? [];
        $disciplinary = $plan['disciplinary'] ?? [];
        $longSuspensions = collect($disciplinary['tournament_long_suspensions'] ?? []);

        // Filter out existing if any to prevent duplicates
        $longSuspensions = $longSuspensions->reject(fn ($tl) => (int) $tl['player_id'] === $playerId);

        $longSuspensions->push([
            'player_id' => $player->id,
            'player_name' => $player->name,
            'team_id' => $player->team_id,
            'reason' => $reason,
            'issued_at' => now()->toISOString(),
            'issued_by' => $issuedBy,
        ]);

        $disciplinary['tournament_long_suspensions'] = $longSuspensions->values()->all();
        $plan['disciplinary'] = $disciplinary;
        $tournament->forceFill(['plan' => $plan])->save();

        return $disciplinary['tournament_long_suspensions'];
    }

    /**
     * Lift or cancel a tournament-long suspension.
     */
    public function liftTournamentLongSuspension(Tournament $tournament, int $playerId, string $reason, int $liftedBy): array
    {
        $plan = $tournament->plan ?? [];
        $disciplinary = $plan['disciplinary'] ?? [];
        $longSuspensions = collect($disciplinary['tournament_long_suspensions'] ?? []);

        $longSuspensions = $longSuspensions->reject(fn ($tl) => (int) $tl['player_id'] === $playerId);

        $disciplinary['tournament_long_suspensions'] = $longSuspensions->values()->all();
        $disciplinary['audit'] = array_merge($disciplinary['audit'] ?? [], [[
            'action' => 'lift_tournament_long',
            'player_id' => $playerId,
            'reason' => $reason,
            'lifted_by' => $liftedBy,
            'lifted_at' => now()->toISOString(),
        ]]);

        $plan['disciplinary'] = $disciplinary;
        $tournament->forceFill(['plan' => $plan])->save();

        return $disciplinary['tournament_long_suspensions'];
    }

    /**
     * @return Collection<int, Fixture>
     */
    private function teamFixtures(Tournament $tournament, int $teamId): Collection
    {
        return Fixture::query()
            ->with('round')
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where(function ($query) use ($teamId) {
                $query->where('home_team_id', $teamId)->orWhere('away_team_id', $teamId);
            })
            ->get()
            ->sortBy(fn (Fixture $fixture) => $this->sortKey($fixture))
            ->values();
    }

    /**
     * @return array{int: int, int: int, int: int}
     */
    private function sortKey(Fixture $fixture): array
    {
        if ($this->isGroupFixture($fixture)) {
            return [0, (int) $fixture->matchday, (int) $fixture->id];
        }

        return [1, (int) ($fixture->round?->order_index ?? 0), (int) $fixture->id];
    }

    /**
     * @param  Collection<int, Fixture>  $fixtures
     * @return Collection<int, Collection<int, MatchEvent>>
     */
    private function cardEventsByMatch(Tournament $tournament, Collection $fixtures, int $teamId): Collection
    {
        $matchIds = $fixtures->pluck('match_id')->filter()->map(fn ($id) => (int) $id)->values();

        if ($matchIds->isEmpty()) {
            return collect();
        }

        return MatchEvent::query()
            ->whereIn('match_id', $matchIds->all())
            ->where('team_id', $teamId)
            ->where(function ($query) {
                $query->whereIn('type', [
                    MatchEventType::YellowCard->value,
                    MatchEventType::SecondYellow->value,
                    MatchEventType::RedCard->value,
                ])->orWhere(function ($q) {
                    $q->where('type', MatchEventType::Foul->value)
                        ->whereIn('punishment', [
                            MatchPunishment::Yellow->value,
                            MatchPunishment::SecondYellow->value,
                            MatchPunishment::Red->value,
                        ]);
                });
            })
            ->orderBy('minute')
            ->orderBy('id')
            ->get()
            ->groupBy('match_id');
    }

    private function isGroupFixture(Fixture $fixture): bool
    {
        return $fixture->round_id === null
            || ! $fixture->round
            || $fixture->round->stage === RoundStage::Group;
    }

    private function isDismissal(MatchEvent $event): bool
    {
        if (in_array($event->type, [MatchEventType::SecondYellow, MatchEventType::RedCard], true)) {
            return true;
        }

        return $event->type === MatchEventType::Foul
            && $event->punishment !== null
            && $event->punishment->isDismissal();
    }

    private function isSecondYellow(?MatchEvent $event): bool
    {
        if (! $event) {
            return false;
        }

        if ($event->type === MatchEventType::SecondYellow) {
            return true;
        }

        return $event->type === MatchEventType::Foul
            && $event->punishment === MatchPunishment::SecondYellow;
    }

    private function isYellow(MatchEvent $event): bool
    {
        if ($event->type === MatchEventType::YellowCard) {
            return true;
        }

        return $event->type === MatchEventType::Foul
            && $event->punishment === MatchPunishment::Yellow;
    }

    private function tournamentFor(Fixture $fixture): Tournament
    {
        $tournament = Tournament::query()
            ->where('competition_id', $fixture->competition_id)
            ->where('season_id', $fixture->season_id)
            ->first();

        if (! $tournament) {
            throw new DomainException('لا يمكن إيجاد البطولة المرتبطة بهذه المباراة', 404);
        }

        return $tournament;
    }
}
