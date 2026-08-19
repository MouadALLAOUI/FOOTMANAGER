<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Enums\RoundStage;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Competition\Models\Round;
use App\Domains\Match\Enums\MatchEventType;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchEvent;
use App\Domains\Match\Models\MatchReferee;
use App\Domains\Match\Models\MatchResultAudit;
use App\Domains\Match\Models\MatchStatistic;
use App\Domains\Match\Models\PlayerMatchPerformance;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use Illuminate\Support\Facades\DB;

class TournamentResultService
{
    public function __construct(
        private readonly TournamentBracketService $bracket,
        private readonly TournamentStandingsService $standings,
        private readonly TournamentSetupService $setup,
        private readonly TournamentSuspensionService $suspensions,
    ) {}

    /**
     * @param  array{
     *     home_score: int,
     *     away_score: int,
     *     home_penalties?: int|null,
     *     away_penalties?: int|null,
     *     extra_time?: bool|null,
     *     notes?: string|null,
     *     scorers?: array<int, array<string, mixed>>,
     *     cards?: array<int, array<string, mixed>>,
     *     events?: array<int, array<string, mixed>>|null,
     *     statistics?: array<int, array<string, mixed>>|null,
     *     player_of_the_match?: int|null,
     *     force?: bool|null,
     * }  $data
     */
    public function enterResult(Fixture $fixture, array $data, ?int $userId = null): Fixture
    {
        return DB::transaction(function () use ($fixture, $data, $userId) {
            $tournament = $this->tournamentFor($fixture);

            if (in_array($tournament->status, [Tournament::STATUS_COMPLETED, Tournament::STATUS_CANCELLED], true)) {
                throw new DomainException('لا يمكن تعديل النتائج بعد انتهاء البطولة');
            }

            $match = $fixture->match;

            if ($match && $match->status === MatchStatus::Finished) {
                throw new DomainException('لا يمكن تعديل نتيجة مباراة مسجلة');
            }

            $this->assertRoundUnlocked($fixture, $tournament);

            $isKnockout = $this->isKnockout($fixture);
            $homeScore = (int) $data['home_score'];
            $awayScore = (int) $data['away_score'];
            $winner = $this->resolveWinner($fixture, $homeScore, $awayScore, $data);

            if (! $match) {
                $match = FootballMatch::create([
                    'competition_id' => $fixture->competition_id,
                    'season_id' => $fixture->season_id,
                    'round_id' => $fixture->round_id,
                    'group_id' => $fixture->group_id,
                    'home_team_id' => $fixture->home_team_id,
                    'away_team_id' => $fixture->away_team_id,
                    'stadium_id' => $fixture->stadium_id,
                    'status' => MatchStatus::Finished,
                    'current_period' => 'full_time',
                    'home_penalties' => isset($data['home_penalties']) ? (int) $data['home_penalties'] : null,
                    'away_penalties' => isset($data['away_penalties']) ? (int) $data['away_penalties'] : null,
                    'extra_time' => isset($data['extra_time']) ? (bool) $data['extra_time'] : false,
                    'notes' => $data['notes'] ?? null,
                    'created_by' => $userId,
                ]);

                $fixture->forceFill(['match_id' => $match->id])->save();
            }

            if (isset($data['events'])) {
                $data['events'] = $this->normalizeCardTypes($data['events']);
                $this->assertNoSuspendedPlayers($fixture, $data['events']);
            }

            $this->replaceResultEvents($match, $data, $userId);

            if (isset($data['events'])) {
                $this->recomputeScore($match);

                if (! ($data['force'] ?? false)
                    && ((int) $match->home_score !== $homeScore || (int) $match->away_score !== $awayScore)) {
                    throw new DomainException('النتيجة لا تتطابق مع أحداث المباراة المسجلة');
                }
            }

            $this->syncStats($match, $data);
            $this->syncPlayerOfTheMatch($match, $data);
            $this->syncReferees($match, $data);

            $match->forceFill([
                'home_score' => $homeScore,
                'away_score' => $awayScore,
                'home_penalties' => isset($data['home_penalties']) ? (int) $data['home_penalties'] : $match->home_penalties,
                'away_penalties' => isset($data['away_penalties']) ? (int) $data['away_penalties'] : $match->away_penalties,
                'extra_time' => isset($data['extra_time']) ? (bool) $data['extra_time'] : $match->extra_time,
                'notes' => $data['notes'] ?? $match->notes,
                'winner_team_id' => $winner,
                'status' => MatchStatus::Finished,
                'current_period' => 'full_time',
                'ended_at' => now(),
            ])->save();

            $fixture->forceFill(['status' => FixtureStatus::Played])->save();

            if ($isKnockout) {
                $this->bracket->progress($fixture, $tournament);

                if ($fixture->round?->stage === RoundStage::Final) {
                    $this->crownChampion($tournament, $winner);
                }
            } else {
                $this->standings->rebuildGroup($tournament, $fixture->group_id);
                $this->setup->ensureKnockoutRoundsWhenReady($tournament, $tournament->season);
            }

            $this->audit($match, $fixture, 'result_created', $userId, [
                'status' => MatchStatus::Finished->value,
                'home_score' => $homeScore,
                'away_score' => $awayScore,
                'home_penalties' => $match->home_penalties,
                'away_penalties' => $match->away_penalties,
                'extra_time' => (bool) $match->extra_time,
            ]);

            return $fixture->fresh(['round', 'group', 'homeTeam', 'awayTeam', 'match']);
        });
    }

    public function undoResult(Fixture $fixture): Fixture
    {
        throw new DomainException('لا يمكن التراجع عن نتيجة مباراة مسجلة');
    }

    /**
     * Load a fixture together with its full result detail for the committee modal.
     */
    public function resultDetail(Fixture $fixture): Fixture
    {
        $fixture->load([
            'round',
            'group',
            'homeTeam',
            'awayTeam',
            'stadium',
            'match' => fn ($query) => $query->with([
                'events' => fn ($query) => $query->with(['team', 'player', 'assistPlayer'])->orderBy('minute')->orderBy('id'),
                'referees',
            ]),
        ]);

        if ($fixture->match) {
            $fixture->match->setRelation('statistics', MatchStatistic::query()->where('match_id', $fixture->match_id)->get());
            $fixture->match->setRelation('performances', PlayerMatchPerformance::query()->where('match_id', $fixture->match_id)->get());
            $fixture->match->setRelation('audits', MatchResultAudit::query()->where('match_id', $fixture->match_id)->with('user:id,name')->latest()->get());
        }

        return $fixture;
    }

    /**
     * Full control save path used by the committee modal. Creates the match when
     * missing, replaces the whole event timeline when `events` is provided, and
     * re-runs standings/bracket propagation when the match is finished.
     *
     * @param  array{
     *     home_score?: int,
     *     away_score?: int,
     *     home_penalties?: int|null,
     *     away_penalties?: int|null,
     *     extra_time?: bool|null,
     *     notes?: string|null,
     *     status?: string|null,
     *     current_period?: string|null,
     *     events?: array<int, array<string, mixed>>|null,
     *     statistics?: array<int, array<string, mixed>>|null,
     *     player_of_the_match?: int|null,
     *     force?: bool|null,
     * }  $data
     */
    public function updateResult(Fixture $fixture, array $data, ?int $userId = null): Fixture
    {
        return DB::transaction(function () use ($fixture, $data, $userId) {
            $tournament = $this->tournamentFor($fixture);

            if (in_array($tournament->status, [Tournament::STATUS_COMPLETED, Tournament::STATUS_CANCELLED], true)) {
                throw new DomainException('لا يمكن تعديل النتائج بعد انتهاء البطولة');
            }

            $match = $fixture->match;
            $isNew = ! $match;

            if ($isNew) {
                $this->assertRoundUnlocked($fixture, $tournament);

                $match = FootballMatch::create([
                    'competition_id' => $fixture->competition_id,
                    'season_id' => $fixture->season_id,
                    'round_id' => $fixture->round_id,
                    'group_id' => $fixture->group_id,
                    'home_team_id' => $fixture->home_team_id,
                    'away_team_id' => $fixture->away_team_id,
                    'stadium_id' => $fixture->stadium_id,
                    'status' => MatchStatus::Scheduled,
                    'current_period' => 'upcoming',
                    'home_penalties' => isset($data['home_penalties']) ? (int) $data['home_penalties'] : null,
                    'away_penalties' => isset($data['away_penalties']) ? (int) $data['away_penalties'] : null,
                    'extra_time' => isset($data['extra_time']) ? (bool) $data['extra_time'] : false,
                    'notes' => $data['notes'] ?? null,
                    'created_by' => $userId,
                ]);

                $fixture->forceFill(['match_id' => $match->id])->save();
            }

            if (array_key_exists('events', $data)) {
                $data['events'] = $this->normalizeCardTypes($data['events']);
                $this->assertNoSuspendedPlayers($fixture, $data['events']);

                $this->replaceResultEvents($match, ['events' => $data['events']], $userId);
                $this->recomputeScore($match);
            }

            $homeScore = array_key_exists('home_score', $data) ? (int) $data['home_score'] : (int) $match->home_score;
            $awayScore = array_key_exists('away_score', $data) ? (int) $data['away_score'] : (int) $match->away_score;

            if (array_key_exists('events', $data) && ! ($data['force'] ?? false)
                && ($homeScore !== (int) $match->home_score || $awayScore !== (int) $match->away_score)) {
                throw new DomainException('النتيجة لا تتطابق مع أحداث المباراة المسجلة');
            }

            $status = $match->status;

            if (isset($data['status'])) {
                $parsed = MatchStatus::tryFrom((string) $data['status']);

                if (! $parsed) {
                    throw new DomainException('حالة المباراة غير صالحة');
                }

                $status = $parsed;
            } elseif (! in_array($match->status, [MatchStatus::Finished, MatchStatus::Cancelled, MatchStatus::Postponed], true)) {
                $status = MatchStatus::Finished;
            }

            $winner = null;

            if ($status === MatchStatus::Finished) {
                $winner = $this->resolveWinner($fixture, $homeScore, $awayScore, [
                    'home_penalties' => array_key_exists('home_penalties', $data) ? $data['home_penalties'] : $match->home_penalties,
                    'away_penalties' => array_key_exists('away_penalties', $data) ? $data['away_penalties'] : $match->away_penalties,
                ]);
            }

            $match->forceFill([
                'home_score' => $homeScore,
                'away_score' => $awayScore,
                'home_penalties' => array_key_exists('home_penalties', $data) ? (int) $data['home_penalties'] : $match->home_penalties,
                'away_penalties' => array_key_exists('away_penalties', $data) ? (int) $data['away_penalties'] : $match->away_penalties,
                'extra_time' => array_key_exists('extra_time', $data) ? (bool) $data['extra_time'] : $match->extra_time,
                'notes' => array_key_exists('notes', $data) ? $data['notes'] : $match->notes,
                'current_minute' => array_key_exists('current_minute', $data) ? (int) $data['current_minute'] : $match->current_minute,
                'winner_team_id' => $winner,
                'status' => $status,
                'current_period' => isset($data['current_period']) ? (string) $data['current_period'] : ($status === MatchStatus::Finished ? 'full_time' : $match->current_period),
                'ended_at' => $status === MatchStatus::Finished ? ($match->ended_at ?? now()) : null,
            ])->save();

            $this->syncStats($match, $data);
            $this->syncPlayerOfTheMatch($match, $data);
            $this->syncReferees($match, $data);

            if ($status === MatchStatus::Finished) {
                $fixture->forceFill(['status' => FixtureStatus::Played])->save();
                $this->applyStandings($fixture, $tournament);
            } elseif ($status === MatchStatus::Cancelled) {
                $fixture->forceFill(['status' => FixtureStatus::Cancelled])->save();
            } elseif ($status === MatchStatus::Postponed) {
                $fixture->forceFill(['status' => FixtureStatus::Postponed])->save();
            }

            $this->audit($match, $fixture, $isNew ? 'result_created' : 'result_updated', $userId, [
                'status' => $status->value,
                'home_score' => $homeScore,
                'away_score' => $awayScore,
                'home_penalties' => $match->home_penalties,
                'away_penalties' => $match->away_penalties,
                'extra_time' => (bool) $match->extra_time,
            ]);

            $this->bracket->syncRoundStatuses($tournament);

            return $fixture->fresh(['round', 'group', 'homeTeam', 'awayTeam', 'match']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function addEvent(Fixture $fixture, array $data, int $userId): MatchEvent
    {
        return DB::transaction(function () use ($fixture, $data, $userId) {
            $tournament = $this->tournamentFor($fixture);

            if (in_array($tournament->status, [Tournament::STATUS_COMPLETED, Tournament::STATUS_CANCELLED], true)) {
                throw new DomainException('لا يمكن تعديل الأحداث بعد انتهاء البطولة');
            }

            $this->applySecondYellowConversion($fixture, $data);

            $this->assertEventPayload($fixture, $data);

            $match = $this->matchFor($fixture);

            $event = MatchEvent::create($this->buildEventRecord($match->id, $data, $userId));

            $this->recomputeScore($match);

            if ($match->status === MatchStatus::Finished) {
                $this->refreshMatchOutcome($match, $fixture);
                $this->applyStandings($fixture, $tournament);
            }

            $this->audit($match, $fixture, 'event_added', $userId, [
                'event_id' => $event->id,
                'type' => $event->type?->value,
                'minute' => $event->minute,
            ]);

            return $event->fresh(['team', 'player', 'assistPlayer']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateEvent(Fixture $fixture, MatchEvent $event, array $data, int $userId): MatchEvent
    {
        return DB::transaction(function () use ($fixture, $event, $data, $userId) {
            $this->assertEventBelongsToMatch($fixture, $event);

            $tournament = $this->tournamentFor($fixture);

            if (in_array($tournament->status, [Tournament::STATUS_COMPLETED, Tournament::STATUS_CANCELLED], true)) {
                throw new DomainException('لا يمكن تعديل الأحداث بعد انتهاء البطولة');
            }

            $data = array_merge([
                'type' => $event->type?->value,
                'team_id' => $event->team_id,
                'player_id' => $event->player_id,
                'assist_player_id' => $event->assist_player_id,
                'minute' => $event->minute,
                'added_time' => $event->added_time,
                'period' => $event->period,
                'description' => $event->description,
                'metadata' => $event->metadata,
            ], $data);

            $data = $this->applySecondYellowConversion($fixture, $data, $event->id);

            $this->assertEventPayload($fixture, $data, $event->id);

            $event->update($this->buildEventRecord($event->match_id, $data, $userId));

            $match = $event->match;
            $this->recomputeScore($match);

            if ($match->status === MatchStatus::Finished) {
                $this->refreshMatchOutcome($match, $fixture);
                $this->applyStandings($fixture, $tournament);
            }

            $this->audit($match, $fixture, 'event_updated', $userId, [
                'event_id' => $event->id,
                'type' => $event->type?->value,
                'minute' => $event->minute,
            ]);

            return $event->fresh(['team', 'player', 'assistPlayer']);
        });
    }

    public function deleteEvent(Fixture $fixture, MatchEvent $event, int $userId): void
    {
        DB::transaction(function () use ($fixture, $event, $userId) {
            $this->assertEventBelongsToMatch($fixture, $event);

            $tournament = $this->tournamentFor($fixture);

            if (in_array($tournament->status, [Tournament::STATUS_COMPLETED, Tournament::STATUS_CANCELLED], true)) {
                throw new DomainException('لا يمكن تعديل الأحداث بعد انتهاء البطولة');
            }

            $match = $event->match;

            $event->delete();

            $this->recomputeScore($match);

            if ($match->status === MatchStatus::Finished) {
                $this->refreshMatchOutcome($match, $fixture);
                $this->applyStandings($fixture, $tournament);
            }

            $this->audit($match, $fixture, 'event_deleted', $userId, [
                'event_id' => $event->id,
            ]);
        });
    }

    public function isKnockout(Fixture $fixture): bool
    {
        return $fixture->round_id !== null
            && $fixture->round
            && $fixture->round->stage !== RoundStage::Group;
    }

    private function resolveWinner(Fixture $fixture, int $homeScore, int $awayScore, array $data): ?int
    {
        if ($homeScore > $awayScore) {
            return (int) $fixture->home_team_id;
        }

        if ($awayScore > $homeScore) {
            return (int) $fixture->away_team_id;
        }

        if (! $this->isKnockout($fixture)) {
            return null;
        }

        $homePenalties = (int) ($data['home_penalties'] ?? 0);
        $awayPenalties = (int) ($data['away_penalties'] ?? 0);

        if ($homePenalties === $awayPenalties) {
            throw new DomainException('المباراة انتهت بالتعادل ويجب تحديد الفائز بركلات الترجيح');
        }

        return $homePenalties > $awayPenalties ? (int) $fixture->home_team_id : (int) $fixture->away_team_id;
    }

    private function replaceResultEvents(FootballMatch $match, array $data, ?int $userId): void
    {
        if (array_key_exists('events', $data) && $data['events'] !== null) {
            MatchEvent::query()->where('match_id', $match->id)->delete();

            foreach ($data['events'] as $event) {
                MatchEvent::create($this->buildEventRecord($match->id, $event, $userId));
            }

            return;
        }

        $this->deleteResultEvents($match);

        $cardEvents = [];

        foreach ($data['scorers'] ?? [] as $scorer) {
            $type = $this->eventType($scorer['type'] ?? 'goal');

            if (! $type) {
                continue;
            }

            $cardEvents[] = [
                'team_id' => $scorer['team_id'] ?? null,
                'player_id' => $scorer['player_id'] ?? null,
                'assist_player_id' => $scorer['assist_player_id'] ?? null,
                'type' => $type->value,
                'minute' => (int) ($scorer['minute'] ?? 1),
                'period' => $scorer['period'] ?? null,
            ];
        }

        foreach ($data['cards'] ?? [] as $card) {
            $type = $this->eventType($card['type'] ?? 'yellow_card');

            if (! $type) {
                continue;
            }

            $cardEvents[] = [
                'team_id' => $card['team_id'] ?? null,
                'player_id' => $card['player_id'] ?? null,
                'type' => $type->value,
                'minute' => (int) ($card['minute'] ?? 1),
                'period' => $card['period'] ?? null,
            ];
        }

        $cardEvents = $this->normalizeCardTypes($cardEvents);

        foreach ($cardEvents as $event) {
            MatchEvent::create($this->buildEventRecord($match->id, $event, $userId));
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function buildEventRecord(int $matchId, array $data, ?int $userId): array
    {
        $type = isset($data['type']) ? MatchEventType::tryFrom((string) $data['type']) : null;

        return [
            'match_id' => $matchId,
            'team_id' => isset($data['team_id']) ? (int) $data['team_id'] : null,
            'player_id' => isset($data['player_id']) ? (int) $data['player_id'] : null,
            'assist_player_id' => isset($data['assist_player_id']) ? (int) $data['assist_player_id'] : null,
            'type' => $type ?? MatchEventType::Other,
            'minute' => (int) ($data['minute'] ?? 1),
            'added_time' => isset($data['added_time']) ? (int) $data['added_time'] : 0,
            'period' => $data['period'] ?? null,
            'description' => $data['description'] ?? null,
            'metadata' => isset($data['metadata']) && is_array($data['metadata']) ? $data['metadata'] : null,
            'icon' => ($type ?? MatchEventType::Other)->icon(),
            'created_by' => $userId,
        ];
    }

    private function deleteResultEvents(FootballMatch $match): void
    {
        MatchEvent::query()
            ->where('match_id', $match->id)
            ->whereIn('type', [
                MatchEventType::Goal->value,
                MatchEventType::OwnGoal->value,
                MatchEventType::PenaltyGoal->value,
                MatchEventType::Assist->value,
                MatchEventType::YellowCard->value,
                MatchEventType::SecondYellow->value,
                MatchEventType::RedCard->value,
            ])
            ->delete();
    }

    private function eventType(string $type): ?MatchEventType
    {
        return match ($type) {
            'goal' => MatchEventType::Goal,
            'own_goal' => MatchEventType::OwnGoal,
            'penalty_goal' => MatchEventType::PenaltyGoal,
            'assist' => MatchEventType::Assist,
            'yellow_card' => MatchEventType::YellowCard,
            'second_yellow' => MatchEventType::SecondYellow,
            'red_card' => MatchEventType::RedCard,
            default => null,
        };
    }

    /**
     * Auto-convert a second yellow card for the same player (in the same
     * match) into a `second_yellow` dismissal. Input events are re-ordered
     * chronologically to decide which yellow is the "second" one.
     *
     * @param  array<int, array<string, mixed>>  $events
     * @return array<int, array<string, mixed>>
     */
    private function normalizeCardTypes(array $events): array
    {
        if ($events === []) {
            return $events;
        }

        $indexed = [];

        foreach ($events as $index => $event) {
            $type = isset($event['type']) ? MatchEventType::tryFrom((string) $event['type']) : null;

            $indexed[] = [
                'index' => $index,
                'event' => $event,
                'type' => $type,
                'minute' => (int) ($event['minute'] ?? 0),
                'added_time' => (int) ($event['added_time'] ?? 0),
            ];
        }

        usort($indexed, fn (array $a, array $b) => [$a['minute'], $a['added_time']] <=> [$b['minute'], $b['added_time']]);

        $yellowByPlayer = [];

        foreach ($indexed as &$entry) {
            $event = &$entry['event'];
            $type = $entry['type'];

            if ($type === MatchEventType::YellowCard && isset($event['player_id'])) {
                $playerId = (int) $event['player_id'];

                if (isset($yellowByPlayer[$playerId])) {
                    $event['type'] = MatchEventType::SecondYellow->value;
                } else {
                    $yellowByPlayer[$playerId] = true;
                }
            }
        }

        unset($entry);

        usort($indexed, fn (array $a, array $b) => $a['index'] <=> $b['index']);

        return array_map(fn (array $entry) => $entry['event'], $indexed);
    }

    /**
     * For the single-event path: when recording a yellow card for a player
     * who already holds one in this match, save it as a second yellow.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function applySecondYellowConversion(Fixture $fixture, array $data, ?int $ignoredEventId = null): array
    {
        $type = isset($data['type']) ? MatchEventType::tryFrom((string) $data['type']) : null;

        if ($type !== MatchEventType::YellowCard || ! isset($data['player_id']) || ! $fixture->match_id) {
            return $data;
        }

        $playerId = (int) $data['player_id'];

        $hasYellow = MatchEvent::query()
            ->where('match_id', $fixture->match_id)
            ->where('player_id', $playerId)
            ->where('type', MatchEventType::YellowCard->value)
            ->when($ignoredEventId, fn ($query) => $query->where('id', '!=', $ignoredEventId))
            ->exists();

        if ($hasYellow) {
            $data['type'] = MatchEventType::SecondYellow->value;
        }

        return $data;
    }

    /**
     * Reject an events payload that involves a player suspended for this
     * fixture (derived from card accumulation in earlier matches).
     *
     * @param  array<int, array<string, mixed>>  $events
     */
    private function assertNoSuspendedPlayers(Fixture $fixture, array $events): void
    {
        $suspendedIds = collect($this->suspensions->suspendedFor($fixture))
            ->pluck('player_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if ($suspendedIds === []) {
            return;
        }

        foreach ($events as $event) {
            foreach (['player_id', 'assist_player_id'] as $key) {
                $playerId = isset($event[$key]) ? (int) $event[$key] : null;

                if ($playerId !== null && $playerId > 0 && in_array($playerId, $suspendedIds, true)) {
                    throw new DomainException('لا يمكن تسجيل أحداث للاعب الموقوف في هذه المباراة');
                }
            }
        }
    }

    private function crownChampion(Tournament $tournament, int $winnerTeamId): void
    {
        $plan = $tournament->plan ?? [];
        $plan['champion_team_id'] = $winnerTeamId;

        $tournament->forceFill([
            'plan' => $plan,
            'status' => Tournament::STATUS_COMPLETED,
        ])->save();

        $this->cleanupFreeTeams($tournament);
    }

    private function cleanupFreeTeams(Tournament $tournament): void
    {
        Team::query()
            ->whereIn('id', TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->pluck('team_id'))
            ->where('is_free', true)
            ->delete();
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

    private function assertRoundUnlocked(Fixture $fixture, Tournament $tournament): void
    {
        if ($this->isKnockout($fixture)) {
            $round = $fixture->round;

            if (! $round) {
                return;
            }

            if (! $fixture->home_team_id || ! $fixture->away_team_id) {
                throw new DomainException('لا يمكن تسجيل نتيجة مباراة إقصائية بدون تحديد الفريقين');
            }

            $firstKnockoutRoundId = Round::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->where('stage', '!=', RoundStage::Group)
                ->orderBy('order_index')
                ->value('id');

            if ($firstKnockoutRoundId && (int) $round->id === (int) $firstKnockoutRoundId) {
                if ($tournament->tournament_format === 'groups_knockout' && ! $this->setup->groupStageComplete($tournament)) {
                    throw new DomainException('أكمل جميع مباريات دور المجموعات قبل تسجيل نتائج الأدوار الإقصائية');
                }

                return;
            }

            if ($fixture->source_home_fixture_id && $fixture->source_away_fixture_id) {
                $sources = Fixture::query()
                    ->with('match')
                    ->whereKey([$fixture->source_home_fixture_id, $fixture->source_away_fixture_id])
                    ->get();

                foreach ($sources as $source) {
                    if (! $source->match?->winner_team_id) {
                        throw new DomainException('لا يمكن تسجيل نتيجة هذا الدور قبل انتهاء المباريات المؤهلة له');
                    }
                }

                return;
            }

            $blockingRoundIds = Round::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->where('stage', '!=', RoundStage::Group)
                ->where('order_index', '<', $round->order_index)
                ->pluck('id');

            if ($blockingRoundIds->isNotEmpty() && ! $this->allClosed(
                Fixture::query()->whereIn('round_id', $blockingRoundIds->all())->get(['id', 'match_id', 'status'])
            )) {
                throw new DomainException('أكمل جميع مباريات الدور السابق قبل تسجيل نتيجة هذا الدور');
            }

            return;
        }

        $matchday = (int) $fixture->matchday;

        if ($matchday > 1) {
            $blockingFixtures = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->whereNotNull('group_id')
                ->where('matchday', '<', $matchday)
                ->get(['id', 'match_id', 'status']);

            if (! $this->allClosed($blockingFixtures)) {
                throw new DomainException('أكمل جميع مباريات الجولة السابقة قبل تسجيل نتيجة هذا الدور');
            }
        }
    }

    private function allClosed(iterable $fixtures): bool
    {
        $fixtures = collect($fixtures);

        if ($fixtures->isEmpty()) {
            return true;
        }

        $matchIds = $fixtures->pluck('match_id')->filter()->values();
        $matchStatuses = $matchIds->isNotEmpty()
            ? FootballMatch::query()->whereKey($matchIds->all())->pluck('status', 'id')
            : collect();

        foreach ($fixtures as $fixture) {
            if (in_array($fixture->status?->value, [FixtureStatus::Cancelled->value, FixtureStatus::Postponed->value], true)) {
                continue;
            }

            $status = $matchStatuses->get($fixture->match_id);
            $status = $status instanceof MatchStatus ? $status->value : $status;

            if (in_array($status, [MatchStatus::Finished->value, MatchStatus::Cancelled->value, MatchStatus::Postponed->value], true)) {
                continue;
            }

            return false;
        }

        return true;
    }

    private function matchFor(Fixture $fixture): FootballMatch
    {
        if ($fixture->match) {
            return $fixture->match;
        }

        $tournament = $this->tournamentFor($fixture);

        $match = FootballMatch::create([
            'competition_id' => $fixture->competition_id,
            'season_id' => $fixture->season_id,
            'round_id' => $fixture->round_id,
            'group_id' => $fixture->group_id,
            'home_team_id' => $fixture->home_team_id,
            'away_team_id' => $fixture->away_team_id,
            'stadium_id' => $fixture->stadium_id,
            'status' => MatchStatus::Scheduled,
            'current_period' => 'upcoming',
            'match_duration_minutes' => $tournament->match_duration_minutes ?: 90,
            'created_by' => $tournament->organizer_id,
        ]);

        $fixture->forceFill(['match_id' => $match->id])->save();

        return $match;
    }

    private function recomputeScore(FootballMatch $match): void
    {
        $home = 0;
        $away = 0;

        foreach ($match->events()->get() as $event) {
            if (! $event->type?->affectsScore()) {
                continue;
            }

            if ($event->type === MatchEventType::OwnGoal) {
                if ((int) $event->team_id === (int) $match->home_team_id) {
                    $away++;
                } elseif ((int) $event->team_id === (int) $match->away_team_id) {
                    $home++;
                }

                continue;
            }

            if ((int) $event->team_id === (int) $match->home_team_id) {
                $home++;
            } elseif ((int) $event->team_id === (int) $match->away_team_id) {
                $away++;
            }
        }

        $match->forceFill([
            'home_score' => $home,
            'away_score' => $away,
        ])->save();
    }

    private function refreshMatchOutcome(FootballMatch $match, Fixture $fixture): void
    {
        $home = (int) $match->home_score;
        $away = (int) $match->away_score;

        $winner = null;

        if ($home > $away) {
            $winner = (int) $fixture->home_team_id;
        } elseif ($away > $home) {
            $winner = (int) $fixture->away_team_id;
        } else {
            $winner = $this->resolveWinner($fixture, $home, $away, [
                'home_penalties' => $match->home_penalties,
                'away_penalties' => $match->away_penalties,
            ]);
        }

        $match->forceFill(['winner_team_id' => $winner])->save();
    }

    private function applyStandings(Fixture $fixture, Tournament $tournament): void
    {
        if ($this->isKnockout($fixture)) {
            $this->bracket->progress($fixture, $tournament);

            if ($fixture->round?->stage === RoundStage::Final) {
                $winner = $fixture->match?->winner_team_id;

                if ($winner) {
                    $this->crownChampion($tournament, (int) $winner);
                }
            }

            return;
        }

        $this->standings->rebuildGroup($tournament, $fixture->group_id);
        $this->setup->ensureKnockoutRoundsWhenReady($tournament, $tournament->season);
    }

    private function syncStats(FootballMatch $match, array $data): void
    {
        if (! isset($data['statistics']) || ! is_array($data['statistics'])) {
            return;
        }

        $keys = [
            'possession',
            'shots',
            'shots_on_target',
            'corners',
            'fouls',
            'offsides',
            'saves',
            'passes',
            'pass_accuracy',
            'expected_goals',
        ];

        foreach ([(int) $match->home_team_id, (int) $match->away_team_id] as $teamId) {
            $row = collect($data['statistics'])->first(
                fn ($stat) => isset($stat['team_id']) && (int) $stat['team_id'] === $teamId,
            );

            if (! $row || ! is_array($row)) {
                MatchStatistic::query()->where('match_id', $match->id)->where('team_id', $teamId)->delete();

                continue;
            }

            $values = [];

            foreach ($keys as $key) {
                if (array_key_exists($key, $row)) {
                    $values[$key] = $row[$key];
                }
            }

            MatchStatistic::query()->updateOrCreate(
                ['match_id' => $match->id, 'team_id' => $teamId],
                $values,
            );
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function syncReferees(FootballMatch $match, array $data): void
    {
        if (! array_key_exists('referees', $data) || ! is_array($data['referees'])) {
            return;
        }

        $referees = $data['referees'];

        if ($referees === []) {
            MatchReferee::query()->where('match_id', $match->id)->delete();

            return;
        }

        $roles = ['main', 'assistant1', 'assistant2', 'fourth'];
        $payload = [];

        foreach ($referees as $entry) {
            $role = (string) ($entry['role'] ?? '');
            $refereeId = (int) ($entry['referee_id'] ?? 0);

            if (! in_array($role, $roles, true) || $refereeId < 1) {
                continue;
            }

            $payload[] = ['role' => $role, 'referee_id' => $refereeId];
        }

        if ($payload === []) {
            MatchReferee::query()->where('match_id', $match->id)->delete();

            return;
        }

        MatchReferee::query()->where('match_id', $match->id)->delete();
        MatchReferee::query()->insert(array_map(
            fn (array $row) => [
                'match_id' => $match->id,
                'referee_id' => $row['referee_id'],
                'role' => $row['role'],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            $payload,
        ));
    }

    private function syncPlayerOfTheMatch(FootballMatch $match, array $data): void
    {
        $playerId = isset($data['player_of_the_match']) ? (int) $data['player_of_the_match'] : null;

        PlayerMatchPerformance::query()->where('match_id', $match->id)->update(['mvp' => false]);

        if (! $playerId) {
            return;
        }

        $performance = PlayerMatchPerformance::query()
            ->where('match_id', $match->id)
            ->where('player_id', $playerId)
            ->first();

        if (! $performance) {
            $player = Player::query()->find($playerId);

            $performance = PlayerMatchPerformance::query()->create([
                'match_id' => $match->id,
                'team_id' => $player?->team_id,
                'player_id' => $playerId,
            ]);
        }

        $performance->forceFill(['mvp' => true])->save();
    }

    /**
     * @param  array<string, mixed>  $changes
     */
    private function audit(FootballMatch $match, Fixture $fixture, string $action, ?int $userId, array $changes = []): void
    {
        MatchResultAudit::query()->create([
            'match_id' => $match->id,
            'fixture_id' => $fixture->id,
            'user_id' => $userId,
            'action' => $action,
            'description' => $this->auditDescription($action, $changes),
            'changes' => $changes,
        ]);
    }

    /**
     * @param  array<string, mixed>  $changes
     */
    private function auditDescription(string $action, array $changes): ?string
    {
        return match ($action) {
            'result_created' => 'تم تسجيل نتيجة المباراة',
            'result_updated' => 'تم تعديل نتيجة المباراة',
            'event_added' => 'تم إضافة حدث ('.$changes['type'].' - دقيقة '.$changes['minute'].')',
            'event_updated' => 'تم تعديل حدث ('.$changes['type'].' - دقيقة '.$changes['minute'].')',
            'event_deleted' => 'تم حذف حدث',
            default => null,
        };
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function assertEventPayload(Fixture $fixture, array $data, ?int $ignoredEventId = null): void
    {
        $type = isset($data['type']) ? MatchEventType::tryFrom((string) $data['type']) : null;

        if (! $type) {
            throw new DomainException('نوع الحدث غير صالح');
        }

        $teamId = isset($data['team_id']) ? (int) $data['team_id'] : null;
        $playerId = isset($data['player_id']) ? (int) $data['player_id'] : null;
        $assistPlayerId = isset($data['assist_player_id']) ? (int) $data['assist_player_id'] : null;

        if ($teamId !== null
            && ! in_array($teamId, [(int) $fixture->home_team_id, (int) $fixture->away_team_id], true)) {
            throw new DomainException('الفريق المحدد لا يشارك في هذه المباراة');
        }

        if ($playerId !== null) {
            if ($teamId === null) {
                throw new DomainException('يجب تحديد الفريق الذي يلعب فيه اللاعب');
            }

            if (! Player::query()->whereKey($playerId)->where('team_id', $teamId)->exists()) {
                throw new DomainException('اللاعب المحدد لا ينتمي إلى الفريق المختار');
            }

            $minute = (int) ($data['minute'] ?? 0);

            if ($this->playerRedCarded($fixture, $playerId, $minute, $ignoredEventId)) {
                throw new DomainException('لا يمكن إضافة أحداث للاعب المطرود في هذه المباراة');
            }

            if ($this->suspensions->playerIsSuspended($fixture, $playerId)) {
                throw new DomainException('لا يمكن تسجيل أحداث للاعب الموقوف في هذه المباراة');
            }
        }

        if ($assistPlayerId !== null) {
            if ($teamId === null) {
                throw new DomainException('يجب تحديد الفريق الذي يلعب فيه اللاعب');
            }

            if (! Player::query()->whereKey($assistPlayerId)->where('team_id', $teamId)->exists()) {
                throw new DomainException('اللاعب المساعد لا ينتمي إلى الفريق المختار');
            }

            if ($this->suspensions->playerIsSuspended($fixture, $assistPlayerId)) {
                throw new DomainException('لا يمكن تسجيل أحداث للاعب الموقوف في هذه المباراة');
            }

            if ($playerId !== null && $assistPlayerId === $playerId) {
                throw new DomainException('لا يمكن أن يكون نفس اللاعب صانعاً ومسجلاً للهدف');
            }
        }

        if ($type === MatchEventType::Substitution && ($playerId === null || $assistPlayerId === null)) {
            throw new DomainException('التبديل يتطلب لاعباً خارجاً وآخر داخلاً');
        }
    }

    private function assertEventBelongsToMatch(Fixture $fixture, MatchEvent $event): void
    {
        if ((int) $event->match_id !== (int) $fixture->match_id) {
            throw new DomainException('الحدث لا ينتمي إلى هذه المباراة', 404);
        }
    }

    private function playerRedCarded(Fixture $fixture, int $playerId, int $minute, ?int $ignoredEventId): bool
    {
        if (! $fixture->match_id) {
            return false;
        }

        return MatchEvent::query()
            ->where('match_id', $fixture->match_id)
            ->where('player_id', $playerId)
            ->whereIn('type', [MatchEventType::RedCard->value, MatchEventType::SecondYellow->value])
            ->where('minute', '<=', $minute)
            ->when($ignoredEventId, fn ($query) => $query->where('id', '!=', $ignoredEventId))
            ->exists();
    }
}
