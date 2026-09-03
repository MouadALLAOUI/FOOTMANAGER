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
use App\Domains\Tournament\Models\Tournament;
use Illuminate\Support\Collection;

/**
 * Computes player suspensions derived from card accumulation within a
 * tournament. The accumulation window is controlled by the tournament's
 * `card_accumulation` setting:
 *
 *  - `disabled`:    no suspensions are enforced.
 *  - `group`:       yellow cards accumulate across group-stage matches only;
 *                   the counter resets before the knockout stage.
 *  - `tournament`:  yellow cards accumulate across the whole tournament.
 *
 * A player is suspended for a match when:
 *  - they accumulated 2 plain yellow cards (within the active window), or
 *  - they were dismissed (red card or second yellow) in their previous
 *    played match.
 *
 * Suspensions are derived forward in time from each team's fixture list, so
 * a served suspension resets the yellow counter.
 */
class TournamentSuspensionService
{
    /**
     * @return array<int, array{player_id: int, player_name: string|null, team_id: int, reason: string}>
     */
    public function suspendedFor(Fixture $fixture): array
    {
        $tournament = $this->tournamentFor($fixture);

        if (! $tournament->cardAccumulationEnabled()) {
            return [];
        }

        $suspended = [];

        foreach ([$fixture->home_team_id, $fixture->away_team_id] as $teamId) {
            if (! $teamId) {
                continue;
            }

            $suspended = array_merge($suspended, $this->simulateTeam(
                $tournament,
                $teamId,
                $fixture,
                $tournament->accumulatesAcrossGroupStageOnly(),
            ));
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
     * @return array<int, array{player_id: int, player_name: string|null, team_id: int, reason: string}>
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

            if ($groupOnly && $isGroup !== $inGroupStage) {
                $state = [];
                $inGroupStage = $isGroup;
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
                            'reason' => $playerState['pending'],
                        ];
                    }

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

    /**
     * Whether an event dismisses the player. Covers the legacy standalone
     * dismissal types and the consolidated foul-with-dismissal punishment.
     */
    private function isDismissal(MatchEvent $event): bool
    {
        if (in_array($event->type, [MatchEventType::SecondYellow, MatchEventType::RedCard], true)) {
            return true;
        }

        return $event->type === MatchEventType::Foul
            && $event->punishment !== null
            && $event->punishment->isDismissal();
    }

    /**
     * Whether an event is a second-yellow dismissal (legacy type or foul
     * punishment), used to decide the recorded suspension reason.
     */
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

    /**
     * Whether an event counts as a single yellow card (legacy type or a foul
     * with a plain yellow punishment).
     */
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
