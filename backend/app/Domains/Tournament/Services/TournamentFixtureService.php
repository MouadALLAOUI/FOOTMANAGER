<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Enums\RoundStage;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Competition\Models\Group;
use App\Domains\Competition\Models\Round;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Services\MatchMembershipService;
use App\Domains\Match\Services\PlayerMatchGuard;
use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Exceptions\FixtureSlotValidationException;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TournamentFixtureService
{
    /** Strategies for handling matches that hit a scheduling conflict. */
    public const STRATEGY_ABORT = 'abort';

    public const STRATEGY_AUTO_ROLL = 'auto_roll';

    public const STRATEGY_SKIP = 'skip';

    public const VALID_STRATEGIES = [
        self::STRATEGY_ABORT,
        self::STRATEGY_AUTO_ROLL,
        self::STRATEGY_SKIP,
    ];

    private ?array $activeTournamentCompetitionIdsCache = null;

    public function __construct(
        private readonly TournamentSetupService $setup,
        private readonly TournamentStandingsService $standings,
        private readonly TournamentBracketService $bracket,
        private readonly TournamentTerrainBookingService $bookings,
    ) {}

    /**
     * Verify every selected terrain can host tournament fixtures.
     *
     * @param  array<int>|null  $stadiumIds
     */
    public function assertStadiumsValid(?array $stadiumIds): void
    {
        if (empty($stadiumIds)) {
            return;
        }

        $stadiums = Stadium::query()->whereKey($stadiumIds)->get();

        $missing = array_diff($stadiumIds, $stadiums->pluck('id')->all());

        if (! empty($missing)) {
            throw new DomainException('أحد الملاعب المحددة غير موجود');
        }

        foreach ($stadiums as $stadium) {
            if (! $stadium->supports_tournaments) {
                throw new DomainException("ملعب «{$stadium->name}» لا يدعم البطولات");
            }

            if (! $stadium->is_open) {
                throw new DomainException("ملعب «{$stadium->name}» مغلق حالياً");
            }

            if (! $stadium->is_available) {
                throw new DomainException("ملعب «{$stadium->name}» غير متاح حالياً");
            }
        }
    }

    /**
     * Dry-run of the group-stage fixture plan. Nothing is written.
     *
     * @param  string|null  $startsOn  Y-m-d
     * @param  array<int>|null  $stadiumIds
     * @return array{matches: array<int, array<string, mixed>>, conflicts: int, skipped: int}
     */
    public function previewGroupFixtures(
        Tournament $tournament,
        ?string $startsOn = null,
        ?array $stadiumIds = null,
        string $defaultTime = '20:00',
        bool $doubleRoundRobin = false,
    ): array {
        $this->assertStadiumsValid($stadiumIds);

        return $this->planGroupFixtures(
            $tournament,
            $startsOn,
            $stadiumIds,
            $defaultTime,
            $doubleRoundRobin,
            self::STRATEGY_ABORT,
        );
    }

    /**
     * Generate the group-stage round-robin fixtures inside a transaction.
     *
     * When any planned match still has a conflict after applying the requested
     * strategy, nothing is persisted (the whole plan is rolled back).
     *
     * @param  string|null  $startsOn  Y-m-d
     * @param  array<int>|null  $stadiumIds
     * @return array{generated: int, conflicts: int, skipped: int, matches: array<int, array<string, mixed>>}
     */
    public function generateGroupFixtures(
        Tournament $tournament,
        ?string $startsOn = null,
        ?array $stadiumIds = null,
        string $defaultTime = '20:00',
        bool $doubleRoundRobin = false,
        string $strategy = self::STRATEGY_ABORT,
    ): array {
        return DB::transaction(function () use ($tournament, $startsOn, $stadiumIds, $defaultTime, $doubleRoundRobin, $strategy) {
            $this->assertStadiumsValid($stadiumIds);

            $plan = $this->planGroupFixtures($tournament, $startsOn, $stadiumIds, $defaultTime, $doubleRoundRobin, $strategy);

            if ($plan['conflicts'] > 0) {
                throw new DomainException($this->conflictErrorMessage($plan));
            }

            return $this->persistPlan($tournament, $plan);
        });
    }

    public function regenerateGroupFixtures(
        Tournament $tournament,
        ?string $startsOn = null,
        ?array $stadiumIds = null,
        string $defaultTime = '20:00',
        bool $doubleRoundRobin = false,
        string $strategy = self::STRATEGY_ABORT,
    ): array {
        return DB::transaction(function () use ($tournament, $startsOn, $stadiumIds, $defaultTime, $doubleRoundRobin, $strategy) {
            $this->assertGroupFixturesRegeneratable($tournament);

            $this->deleteGroupFixtures($tournament);

            return $this->generateGroupFixtures($tournament, $startsOn, $stadiumIds, $defaultTime, $doubleRoundRobin, $strategy);
        });
    }

    private function assertGroupFixturesRegeneratable(Tournament $tournament): void
    {
        $competitionId = $tournament->competition_id;
        $seasonId = $tournament->season_id;

        if (! $competitionId || ! $seasonId) {
            return;
        }

        $hasPlayed = Fixture::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $seasonId)
            ->whereNotNull('group_id')
            ->whereHas('match', fn ($q) => $q->where('status', MatchStatus::Finished->value))
            ->exists();

        if ($hasPlayed) {
            throw new DomainException('لا يمكن إعادة إنشاء البرنامج بعد بدء المباريات — أحد المباريات لها نتيجة مسجلة');
        }
    }

    /**
     * Ordered list of the teams expected to enter the knockout stage, derived
     * from the group-stage standings (groups_knockout) or the whole field
     * (knockout_only). The committee can edit this list before generating.
     *
     * @return array{expected: int, teams: array<int, array<string, mixed>>, count: int}
     */
    public function qualifiedTeamsDetailed(Tournament $tournament): array
    {
        $this->setup->buildStructure($tournament);

        $expected = $this->setup->resolveKnockoutTeams($tournament);
        $teams = [];

        if ($tournament->tournament_format === 'groups_knockout') {
            $qualify = max(1, (int) ($tournament->qualify_per_group ?: 2));
            $standings = $this->standings->standings($tournament);

            foreach ($standings['groups'] as $group) {
                foreach (array_slice($group['rows'], 0, $qualify) as $rank => $row) {
                    if (! $row['team']) {
                        continue;
                    }
                    $teams[] = [
                        'team_id' => (int) $row['team_id'],
                        'name' => $row['team']['name'],
                        'logo_url' => $row['team']['logo_url'],
                        'group_id' => $row['group_id'],
                        'group_name' => $group['name'],
                        'rank' => $rank + 1,
                    ];
                }
            }
        } else {
            $pivots = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->orderBy('group_id')
                ->orderBy('group_position')
                ->with('team:id,name,logo_path')
                ->get();

            foreach ($pivots as $pivot) {
                $teams[] = [
                    'team_id' => (int) $pivot->team_id,
                    'name' => $pivot->team?->name,
                    'logo_url' => $pivot->team?->logo_url,
                    'group_id' => $pivot->group_id,
                    'group_name' => null,
                    'rank' => null,
                ];
            }
        }

        return [
            'expected' => $expected,
            'teams' => $teams,
            'count' => count($teams),
        ];
    }

    /**
     * Terrains that can host tournament fixtures (supports_tournaments + open
     * + available), annotated with slot availability at the requested date/time.
     *
     * Booking conflicts reuse the authoritative SlotAvailabilityService (via
     * TerrainBooking::getConflictMessage) and existing tournament fixtures are
     * considered from the fixtures table. Everything is filtered/queried here
     * so the client only receives relevant terrains.
     *
     * @return array{
     *     date: string,
     *     time: string,
     *     terrains: array<int, array<string, mixed>>,
     *     total: int,
     *     available: int,
     * }
     */
    public function tournamentTerrains(Tournament $tournament, ?string $date = null, ?string $time = null): array
    {
        $date = $date ?: ($tournament->start_date?->toDateString() ?? now()->toDateString());
        $time = $time ?: '20:00';
        $endTime = $this->endTimeFor($time);

        $stadiums = Stadium::query()
            ->where('supports_tournaments', true)
            ->where('is_open', true)
            ->where('is_available', true)
            ->orderBy('name')
            ->get();

        $slot = Carbon::parse($date.' '.$time);

        $activeCompetitionIds = $this->activeTournamentCompetitionIds();

        $fixtureConflictIds = $stadiums->isNotEmpty()
            ? Fixture::query()
                ->whereIn('competition_id', $activeCompetitionIds)
                ->whereIn('stadium_id', $stadiums->pluck('id')->all())
                ->where('scheduled_at', '>', $slot->copy()->subHours(2))
                ->where('scheduled_at', '<', $slot->copy()->addHours(2))
                ->whereNotIn('status', [FixtureStatus::Postponed->value, FixtureStatus::Cancelled->value])
                ->pluck('stadium_id')
                ->all()
            : [];

        $fixtureConflictIds = array_flip(array_unique(array_map('intval', $fixtureConflictIds)));

        $terrains = $stadiums->map(function (Stadium $stadium) use ($date, $time, $endTime, $fixtureConflictIds) {
            $reason = null;

            if (isset($fixtureConflictIds[$stadium->id])) {
                $reason = 'هذا التوقيت محجوز لمباراة بطولة أخرى';
            } else {
                $reason = TerrainBooking::getConflictMessage($stadium->id, $date, $time, $endTime);
            }

            return [
                'id' => $stadium->id,
                'name' => $stadium->name,
                'city' => $stadium->city,
                'type' => $stadium->type,
                'cover_image_url' => $stadium->cover_image_url,
                'price_per_hour' => $stadium->price_per_hour !== null ? (float) $stadium->price_per_hour : null,
                'price_per_team' => $stadium->price_per_team !== null ? (float) $stadium->price_per_team : null,
                'total_price' => $stadium->total_price !== null ? (float) $stadium->total_price : null,
                'supports_tournaments' => (bool) $stadium->supports_tournaments,
                'slot_available' => $reason === null,
                'unavailable_reason' => $reason,
            ];
        })->all();

        return [
            'date' => $date,
            'time' => $time,
            'terrains' => $terrains,
            'total' => count($terrains),
            'available' => count(array_filter($terrains, fn ($t) => $t['slot_available'])),
        ];
    }

    /**
     * Server-side gate for rescheduling a tournament match: the terrain must
     * support tournaments, be open/available, free at the new slot (authoritative
     * booking check + no conflicting tournament fixture) and neither team may
     * have another match in the same window.
     */
    public function assertRescheduleAvailable(
        ?int $stadiumId,
        Carbon $datetime,
        int $homeTeamId,
        int $awayTeamId,
        ?int $excludeMatchId = null,
    ): void {
        if ($stadiumId !== null) {
            $this->assertStadiumsValid([$stadiumId]);

            if ($this->stadiumHasFixtureConflict($stadiumId, $datetime, $excludeMatchId)) {
                throw new DomainException('هذا التوقيت محجوز لمباراة بطولة أخرى في هذا الملعب');
            }

            $time = $datetime->format('H:i');

            if (TerrainBooking::getConflictMessage($stadiumId, $datetime->toDateString(), $time, $this->endTimeFor($time))) {
                throw new DomainException('هذا التوقيت محجوز في الملعب المحدد');
            }
        }

        if ($homeTeamId > 0 && MatchMembershipService::teamHasMatchConflict($homeTeamId, $datetime, $excludeMatchId)) {
            throw new DomainException('الفريق المضيف لديه مباراة أخرى في هذا التوقيت');
        }

        if ($awayTeamId > 0 && MatchMembershipService::teamHasMatchConflict($awayTeamId, $datetime, $excludeMatchId)) {
            throw new DomainException('الفريق الضيف لديه مباراة أخرى في هذا التوقيت');
        }
    }

    /**
     * Dry-run of the knockout first-round schedule. The bracket is NOT created:
     * pairings are computed purely in memory from the ordered seeds.
     *
     * @param  array<int, int>  $teamIds  ordered knockout seeds
     * @return array{matches: array<int, array<string, mixed>>, conflicts: int, skipped: int}
     */
    public function previewKnockoutFixtures(
        Tournament $tournament,
        array $teamIds,
        ?string $startsOn = null,
        ?array $stadiumIds = null,
        string $defaultTime = '20:00',
    ): array {
        $this->assertStadiumsValid($stadiumIds);
        $this->assertKnockoutReady($tournament, $teamIds);

        return $this->planKnockoutPairs(
            $tournament,
            $this->knockoutPairs($tournament, array_values($teamIds)),
            $startsOn,
            $stadiumIds,
            $defaultTime,
            self::STRATEGY_ABORT,
        );
    }

    /**
     * Generate the knockout bracket inside a transaction: all round fixtures
     * are created, the first round is populated with the (editable) qualified
     * teams and every populated fixture is scheduled. Conflicts follow the
     * requested strategy; if any remains the whole bracket is rolled back.
     *
     * @param  array<int, int>  $teamIds  ordered knockout seeds
     * @return array{generated: int, conflicts: int, skipped: int, matches: array<int, array<string, mixed>>}
     */
    public function generateKnockoutFixtures(
        Tournament $tournament,
        array $teamIds,
        ?string $startsOn = null,
        ?array $stadiumIds = null,
        string $defaultTime = '20:00',
        string $strategy = self::STRATEGY_ABORT,
    ): array {
        return DB::transaction(function () use ($tournament, $teamIds, $startsOn, $stadiumIds, $defaultTime, $strategy) {
            $this->assertStadiumsValid($stadiumIds);
            $this->assertKnockoutReady($tournament, $teamIds);

            $seeds = array_values($teamIds);

            // Rebuild the bracket (idempotent; deletes existing knockout fixtures first).
            $mode = $this->knockoutMode($tournament);
            $this->deleteKnockoutFixtures($tournament);
            $this->bracket->generateBracket($tournament, $mode);
            $this->bracket->populateKnockout($tournament, $seeds, $mode);

            $plan = $this->planKnockoutPairs($tournament, $this->knockoutPairs($tournament, $seeds), $startsOn, $stadiumIds, $defaultTime, $strategy);

            if ($plan['conflicts'] > 0) {
                throw new DomainException($this->conflictErrorMessage($plan));
            }

            $firstRound = Round::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->where('stage', '!=', RoundStage::Group)
                ->orderBy('order_index')
                ->firstOrFail();

            $fixtures = Fixture::query()
                ->where('round_id', $firstRound->id)
                ->orderBy('id')
                ->get()
                ->values();

            $created = [];

            foreach ($plan['matches'] as $index => $match) {
                $fixture = $fixtures[$index] ?? null;

                if (! $fixture) {
                    continue;
                }

                $fixture->forceFill([
                    'stadium_id' => $match['stadium_id'],
                    'scheduled_at' => $match['datetime'],
                    'status' => FixtureStatus::Scheduled,
                ])->save();

                if ($fixture->match) {
                    $fixture->match->forceFill([
                        'stadium_id' => $match['stadium_id'],
                        'status' => MatchStatus::Scheduled,
                    ])->save();
                }

                $this->bookings->createForFixture($tournament, $fixture);

                $created[] = $match;
            }

            return [
                'generated' => count($created),
                'conflicts' => $plan['conflicts'],
                'skipped' => $plan['skipped'],
                'matches' => $created,
            ];
        });
    }

    /**
     * Generate the group-stage fixture LAYOUT: the exact number of round-robin
     * match slots per group (N teams = N-1 matchdays, doubled in double
     * round-robin), each with its stadium + datetime, but WITHOUT any teams
     * assigned. The committee fills home/away afterwards by drag & drop via
     * assignSlot(); the FootballMatch is materialized lazily once both sides
     * are filled.
     *
     * @param  string|null  $startsOn  Y-m-d
     * @param  array<int>|null  $stadiumIds
     * @return array{generated: int, conflicts: int, skipped: int, matches: array<int, array<string, mixed>>}
     */
    public function generateGroupLayout(
        Tournament $tournament,
        ?string $startsOn = null,
        ?array $stadiumIds = null,
        string $defaultTime = '20:00',
        bool $doubleRoundRobin = false,
    ): array {
        return DB::transaction(function () use ($tournament, $startsOn, $stadiumIds, $defaultTime, $doubleRoundRobin) {
            $this->assertStadiumsValid($stadiumIds);

            $this->setup->buildStructure($tournament);

            $competitionId = $tournament->competition_id;
            $seasonId = $tournament->season_id;

            $groupRound = Round::query()
                ->where('competition_id', $competitionId)
                ->where('season_id', $seasonId)
                ->where('stage', RoundStage::Group)
                ->firstOrFail();

            $groups = Group::query()
                ->where('competition_id', $competitionId)
                ->where('season_id', $seasonId)
                ->orderBy('name')
                ->get();

            $stadiumNames = $this->stadiumNames($stadiumIds);
            $startDay = Carbon::parse($startsOn ?? $tournament->start_date?->toDateString() ?? now()->toDateString());
            $matchesPerDay = (int) ($tournament->matches_per_day ?? 0);

            $stadiumSlots = [];
            $created = [];

            foreach ($groups as $group) {
                $teamIds = TournamentTeam::query()
                    ->where('tournament_id', $tournament->id)
                    ->where('status', TournamentTeam::STATUS_REGISTERED)
                    ->where('group_id', $group->id)
                    ->orderBy('group_position')
                    ->orderBy('id')
                    ->pluck('team_id')
                    ->all();

                if (count($teamIds) < 2) {
                    continue;
                }

                $teamCount = count($teamIds);

                // The circle method on a dummy list sizes the layout slots; the
                // actual matchups are left empty for the committee to fill.
                foreach ($this->roundRobin(array_fill(0, $teamCount, 0), $doubleRoundRobin) as $roundIndex => $pairs) {
                    foreach ($pairs as $pair) {
                        $dayOffset = $matchesPerDay > 0
                            ? intdiv(count($created), $matchesPerDay)
                            : $roundIndex;

                        $matchDay = $startDay->copy()->addDays($dayOffset);

                        [$stadiumId, $datetime] = $this->resolveLayoutSlot($stadiumIds, $matchDay, $defaultTime, $stadiumSlots);

                        $fixture = Fixture::create([
                            'competition_id' => $competitionId,
                            'season_id' => $seasonId,
                            'round_id' => $groupRound->id,
                            'matchday' => $roundIndex + 1,
                            'group_id' => $group->id,
                            'stadium_id' => $stadiumId,
                            'scheduled_at' => $datetime,
                            'status' => FixtureStatus::Scheduled,
                        ]);

                        $this->bookings->createForFixture($tournament, $fixture);

                        if ($stadiumId !== null) {
                            $stadiumSlots[$stadiumId][$datetime->format('Y-m-d H:i:00')] = true;
                        }

                        $created[] = [
                            'id' => $fixture->id,
                            'group_id' => $group->id,
                            'group_name' => $group->name,
                            'matchday' => $roundIndex + 1,
                            'home_team_id' => null,
                            'away_team_id' => null,
                            'stadium_id' => $stadiumId,
                            'stadium_name' => $stadiumId ? ($stadiumNames[$stadiumId] ?? null) : null,
                            'scheduled_at' => $datetime->toIso8601String(),
                            'slot_type' => 'pair',
                        ];
                    }
                }
            }

            return [
                'generated' => count($created),
                'conflicts' => 0,
                'skipped' => 0,
                'matches' => $created,
            ];
        });
    }

    /**
     * Generate the knockout fixture LAYOUT: the whole bracket (all rounds) is
     * created with its winner-source wiring but the first round and its bye
     * slots are left EMPTY so the committee fills them manually. Pairing slots
     * receive their stadium + datetime; structural bye slots stay unscheduled
     * until a team is dropped into them.
     *
     * @param  array<int>|null  $stadiumIds
     * @return array{generated: int, conflicts: int, skipped: int, matches: array<int, array<string, mixed>>}
     */
    public function generateKnockoutLayout(
        Tournament $tournament,
        ?string $startsOn = null,
        ?array $stadiumIds = null,
        string $defaultTime = '20:00',
    ): array {
        return DB::transaction(function () use ($tournament, $startsOn, $stadiumIds, $defaultTime) {
            $this->assertStadiumsValid($stadiumIds);

            if (($tournament->plan ?? [])['knockout']['mode'] ?? null === 'groups6') {
                throw new DomainException('أنشئ الأدوار الإقصائية من صفحة السلم بعد اكتمال أدوار المجموعات المصغرة');
            }

            $mode = $this->knockoutMode($tournament);

            $this->deleteKnockoutFixtures($tournament);
            $this->bracket->generateBracket($tournament, $mode);

            $firstRound = Round::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->where('stage', '!=', RoundStage::Group)
                ->orderBy('order_index')
                ->firstOrFail();

            $fixtures = Fixture::query()
                ->where('round_id', $firstRound->id)
                ->orderBy('id')
                ->get()
                ->values();

            $pairIndexes = $this->bracket->pairIndexes($tournament, $fixtures->count());

            $stadiumNames = $this->stadiumNames($stadiumIds);
            $startDay = Carbon::parse($startsOn ?? $tournament->start_date?->toDateString() ?? now()->toDateString());
            $matchesPerDay = (int) ($tournament->matches_per_day ?? 0);

            $stadiumSlots = [];
            $created = [];
            $count = 0;

            foreach ($fixtures as $index => $fixture) {
                if (! in_array($index, $pairIndexes, true)) {
                    continue;
                }

                $dayOffset = $matchesPerDay > 0 ? intdiv($count, $matchesPerDay) : $count;
                $matchDay = $startDay->copy()->addDays($dayOffset);

                [$stadiumId, $datetime] = $this->resolveLayoutSlot($stadiumIds, $matchDay, $defaultTime, $stadiumSlots);

                $fixture->forceFill([
                    'stadium_id' => $stadiumId,
                    'scheduled_at' => $datetime,
                    'status' => FixtureStatus::Scheduled,
                ])->save();

                $this->bookings->createForFixture($tournament, $fixture);

                if ($stadiumId !== null) {
                    $stadiumSlots[$stadiumId][$datetime->format('Y-m-d H:i:00')] = true;
                }

                $created[] = [
                    'id' => $fixture->id,
                    'round_id' => $firstRound->id,
                    'round_name' => $firstRound->name,
                    'matchday' => $index + 1,
                    'home_team_id' => null,
                    'away_team_id' => null,
                    'stadium_id' => $stadiumId,
                    'stadium_name' => $stadiumId ? ($stadiumNames[$stadiumId] ?? null) : null,
                    'scheduled_at' => $datetime->toIso8601String(),
                    'slot_type' => 'pair',
                ];

                $count++;
            }

            return [
                'generated' => count($created),
                'conflicts' => 0,
                'skipped' => 0,
                'matches' => $created,
            ];
        });
    }

    /**
     * Assign (or clear) one team on a fixture slot — the manual counterpart of
     * auto-generation. Group fixtures are validated against the round-robin
     * rules (registration, group membership, per-matchday uniqueness, opponent
     * repeats, booking conflicts); knockout fixtures accept only first-round
     * pair slots (qualified teams) and structural bye slots.
     */
    public function assignSlot(Tournament $tournament, Fixture $fixture, string $side, ?int $teamId): Fixture
    {
        return DB::transaction(function () use ($tournament, $fixture, $side, $teamId) {
            $this->assertSlotAssignable($fixture);

            if ($teamId !== null) {
                $this->assertTeamRegistered($tournament, $teamId);
            }

            if ($fixture->round?->stage === RoundStage::Group) {
                return $this->assignGroupSlot($tournament, $fixture, $side, $teamId);
            }

            return $this->assignKnockoutSlot($tournament, $fixture, $side, $teamId);
        });
    }

    /**
     * Persist a batch of manual slot changes atomically. All referenced sides
     * are cleared first (freeing any team sitting on the opposite side of the
     * same fixture), then each set re-runs the full per-slot validation
     * against the database so intra-batch conflicts are still caught.
     *
     * @param  array<int, array{id: int, side: string, team_id: int|null}>  $slots
     */
    public function assignSlots(Tournament $tournament, array $slots): \Illuminate\Support\Collection
    {
        return DB::transaction(function () use ($tournament, $slots) {
            $ids = array_values(array_unique(array_map(fn ($s) => (int) $s['id'], $slots)));

            $fixtures = Fixture::query()
                ->whereKey($ids)
                ->get()
                ->keyBy('id');

            foreach ($ids as $id) {
                $fixture = $fixtures->get($id);

                if (! $fixture) {
                    throw new DomainException('مباراة غير موجودة', 404);
                }

                $this->assertSlotAssignable($fixture);
            }

            foreach ($slots as $entry) {
                $fixture = $fixtures->get((int) $entry['id']);
                $teamId = $entry['team_id'] !== null ? (int) $entry['team_id'] : null;

                if ($entry['side'] === 'home') {
                    if ($teamId !== null && (int) $fixture->away_team_id === $teamId) {
                        $fixture->away_team_id = null;
                    }
                    $fixture->home_team_id = null;
                } elseif ($entry['side'] === 'away') {
                    if ($teamId !== null && (int) $fixture->home_team_id === $teamId) {
                        $fixture->home_team_id = null;
                    }
                    $fixture->away_team_id = null;
                } else {
                    $fixture->bye_team_id = null;
                }

                $fixture->status = FixtureStatus::Scheduled;
                $fixture->save();
                $this->syncFixtureTeams($tournament, $fixture);
            }

            $teamNames = Team::query()
                ->whereIn('id', array_values(array_unique(array_filter(
                    array_map(fn ($s) => $s['team_id'] !== null ? (int) $s['team_id'] : null, $slots),
                    fn ($id) => $id !== null
                ))))
                ->pluck('name', 'id');

            foreach ($slots as $entry) {
                if ($entry['team_id'] === null) {
                    continue;
                }

                $fixture = $fixtures->get((int) $entry['id']);
                $teamId = (int) $entry['team_id'];

                try {
                    $this->assignSlot($tournament, $fixture, $entry['side'], $teamId);
                } catch (DomainException $e) {
                    $teamName = $teamNames->get($teamId, sprintf('#%d', $teamId));

                    throw new FixtureSlotValidationException(
                        sprintf('%s: %s', $teamName, $e->getMessage()),
                        [
                            'fixture_id' => $fixture->id,
                            'side' => $entry['side'],
                            'team_id' => $teamId,
                            'message' => sprintf('%s: %s', $teamName, $e->getMessage()),
                        ]
                    );
                }
            }

            return $fixtures->values();
        });
    }

    /**
     * Pick the stadium + datetime for one (teamless) layout slot.
     *
     * @param  array<int>|null  $stadiumIds
     * @param  array<int, array<string, true>>  $stadiumSlots
     * @return array{0: int|null, 1: Carbon, 2: array<int, string>}
     */
    private function resolveLayoutSlot(?array $stadiumIds, Carbon $matchDay, string $defaultTime, array &$stadiumSlots): array
    {
        $preferred = Carbon::parse($matchDay->toDateString().' '.$defaultTime.':00');
        $conflicts = [];
        $chosenStadium = null;

        if (! empty($stadiumIds)) {
            foreach ($stadiumIds as $stadiumId) {
                if ($this->slotFree($stadiumId, $preferred, $stadiumSlots)) {
                    $chosenStadium = $stadiumId;

                    break;
                }
            }

            if ($chosenStadium === null) {
                $conflicts[] = 'جميع الملاعب المحددة محجوزة في هذا التوقيت';
            }
        }

        return [$chosenStadium, $preferred, $conflicts];
    }

    private function assertSlotAssignable(Fixture $fixture): void
    {
        $matchStatus = $fixture->match?->status;
        $matchStatus = $matchStatus instanceof MatchStatus ? $matchStatus->value : $matchStatus;

        if ($matchStatus !== null && in_array($matchStatus, [...MatchStatus::live(), MatchStatus::Finished->value], true)) {
            throw new DomainException('لا يمكن تعديل المباراة بعد بدايتها');
        }

        if (in_array($fixture->status?->value, [FixtureStatus::Cancelled->value, FixtureStatus::Postponed->value], true)) {
            throw new DomainException('المباراة ملغاة أو مؤجلة — استعدها أولاً');
        }
    }

    private function assertTeamRegistered(Tournament $tournament, int $teamId): void
    {
        $registered = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->pluck('team_id')
            ->all();

        if (! in_array($teamId, $registered, true)) {
            throw new DomainException('الفريق غير مسجل في البطولة');
        }
    }

    private function assignGroupSlot(Tournament $tournament, Fixture $fixture, string $side, ?int $teamId): Fixture
    {
        if (! in_array($side, ['home', 'away'], true)) {
            throw new DomainException('مقاعد دور المجموعات تقبل فريقين فقط');
        }

        if ($teamId !== null) {
            $this->assertGroupMembership($tournament, $fixture, $teamId);
            $this->assertGroupAssignmentRules($tournament, $fixture, $side, $teamId, $fixture->home_team_id, $fixture->away_team_id);
            $this->assertNoDatetimeConflict($fixture, $teamId);
        }

        if ($side === 'home') {
            $fixture->home_team_id = $teamId;
        } else {
            $fixture->away_team_id = $teamId;
        }

        $fixture->save();
        $this->syncFixtureTeams($tournament, $fixture);

        return $fixture;
    }

    private function assertGroupMembership(Tournament $tournament, Fixture $fixture, int $teamId): void
    {
        if ($fixture->group_id === null) {
            return;
        }

        $group = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->where('team_id', $teamId)
            ->value('group_id');

        if ((int) $group !== (int) $fixture->group_id) {
            throw new DomainException('الفريق لا ينتمي إلى هذه المجموعة');
        }
    }

    private function assertGroupAssignmentRules(
        Tournament $tournament,
        Fixture $fixture,
        string $side,
        int $teamId,
        ?int $currentHome,
        ?int $currentAway,
    ): void {
        $competitionId = $tournament->competition_id;
        $seasonId = $tournament->season_id;

        $otherTeam = $side === 'home' ? (int) ($currentAway ?? 0) : (int) ($currentHome ?? 0);

        if ($otherTeam === $teamId) {
            throw new DomainException('الفريق نفسه موجود على الجهة المقابلة — امسحه أولاً');
        }

        $sameMatchday = Fixture::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $seasonId)
            ->where('id', '!=', $fixture->id)
            ->whereNotNull('matchday')
            ->where('matchday', $fixture->matchday)
            ->whereNotIn('status', [FixtureStatus::Cancelled->value, FixtureStatus::Postponed->value])
            ->where(function ($q) use ($teamId) {
                $q->where('home_team_id', $teamId)->orWhere('away_team_id', $teamId);
            })
            ->exists();

        if ($sameMatchday) {
            throw new DomainException('الفريق لديه مباراة أخرى في هذه الجولة');
        }

        if ($otherTeam > 0) {
            $double = $this->groupIsDoubleRoundRobin($tournament, $fixture);

            $meetings = Fixture::query()
                ->where('competition_id', $competitionId)
                ->where('season_id', $seasonId)
                ->where('group_id', $fixture->group_id)
                ->where('id', '!=', $fixture->id)
                ->whereNotIn('status', [FixtureStatus::Cancelled->value, FixtureStatus::Postponed->value])
                ->where(function ($q) use ($teamId, $otherTeam) {
                    $q->where(function ($q2) use ($teamId, $otherTeam) {
                        $q2->where('home_team_id', $teamId)->where('away_team_id', $otherTeam);
                    })->orWhere(function ($q2) use ($teamId, $otherTeam) {
                        $q2->where('home_team_id', $otherTeam)->where('away_team_id', $teamId);
                    });
                })
                ->count();

            if (! $double && $meetings >= 1) {
                throw new DomainException('التقى الفريقان سابقاً في دور المجموعات');
            }

            if ($double && $meetings >= 2) {
                throw new DomainException('التقى الفريقان مرتين سابقاً في دور المجموعات');
            }
        }
    }

    /**
     * Infer whether a group is a double round-robin from its layout: a group of
     * N teams has N-1 matchdays single, 2(N-1) double.
     */
    private function groupIsDoubleRoundRobin(Tournament $tournament, Fixture $fixture): bool
    {
        if ($fixture->group_id === null) {
            return false;
        }

        $members = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->where('group_id', $fixture->group_id)
            ->count();

        if ($members < 2) {
            return false;
        }

        $maxMatchday = (int) Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('group_id', $fixture->group_id)
            ->whereNotNull('matchday')
            ->max('matchday');

        return $maxMatchday > ($members - 1);
    }

    private function assertNoDatetimeConflict(Fixture $fixture, int $teamId): void
    {
        if (! $fixture->scheduled_at) {
            return;
        }

        if (MatchMembershipService::teamHasMatchConflict($teamId, $fixture->scheduled_at, $fixture->match_id)) {
            throw new DomainException('الفريق لديه مباراة أخرى في نفس هذا التوقيت');
        }
    }

    private function assignKnockoutSlot(Tournament $tournament, Fixture $fixture, string $side, ?int $teamId): Fixture
    {
        $slotType = $this->bracket->slotType($tournament, $fixture);

        if ($slotType === null) {
            throw new DomainException('يمكن تعبئة الدور الأول يدوياً فقط — الأدوار التالية تتقدم تلقائياً من الفائزين');
        }

        if ($side === 'bye') {
            if ($slotType !== 'bye') {
                throw new DomainException('هذه المباراة ليست مكان استراحة');
            }

            if ($teamId !== null) {
                $this->assertKnockoutEligible($tournament, $teamId);
                $this->assertKnockoutTeamFree($tournament, $fixture, $teamId);
            }

            $fixture->forceFill([
                'home_team_id' => null,
                'away_team_id' => null,
                'bye_team_id' => $teamId,
                'status' => $teamId !== null ? FixtureStatus::Bye : FixtureStatus::Scheduled,
            ])->save();

            if ($fixture->match_id) {
                FootballMatch::whereKey($fixture->match_id)->delete();
                $fixture->forceFill(['match_id' => null])->save();
            }

            return $fixture;
        }

        if ($slotType !== 'pair') {
            throw new DomainException('لا يمكن وضع فريقين في مكان الاستراحة');
        }

        if ($teamId !== null) {
            $this->assertKnockoutEligible($tournament, $teamId);
            $this->assertKnockoutTeamFree($tournament, $fixture, $teamId);
            $this->assertNoDatetimeConflict($fixture, $teamId);
        }

        if ($side === 'home') {
            $fixture->home_team_id = $teamId;
        } else {
            $fixture->away_team_id = $teamId;
        }

        $fixture->bye_team_id = null;
        $fixture->status = FixtureStatus::Scheduled;
        $fixture->save();

        $this->syncFixtureTeams($tournament, $fixture);

        return $fixture;
    }

    private function assertKnockoutEligible(Tournament $tournament, int $teamId): void
    {
        $qualified = $this->qualifiedTeamsDetailed($tournament)['teams'];
        $ids = array_map(fn ($t) => (int) $t['team_id'], $qualified);

        if (! in_array($teamId, $ids, true)) {
            throw new DomainException('الفريق غير مؤهل للأدوار الإقصائية من ترتيب دور المجموعات');
        }
    }

    private function assertKnockoutTeamFree(Tournament $tournament, Fixture $fixture, int $teamId): void
    {
        $firstRoundId = $this->bracket->firstKnockoutRoundId($tournament);

        if ($firstRoundId === null) {
            return;
        }

        $used = Fixture::query()
            ->where('round_id', $firstRoundId)
            ->where('id', '!=', $fixture->id)
            ->where(function ($q) use ($teamId) {
                $q->where('home_team_id', $teamId)
                    ->orWhere('away_team_id', $teamId)
                    ->orWhere('bye_team_id', $teamId);
            })
            ->exists();

        if ($used) {
            throw new DomainException('الفريق مستخدم في مباراة أخرى بالدور الأول');
        }
    }

    /**
     * Materialize (or drop) the FootballMatch that mirrors a filled fixture:
     * one is created once both sides have a team and removed again whenever a
     * side is cleared before the match has started.
     */
    private function syncFixtureTeams(Tournament $tournament, Fixture $fixture): void
    {
        $home = $fixture->home_team_id;
        $away = $fixture->away_team_id;

        if ($home && $away) {
            if ($fixture->match_id) {
                $fixture->match->forceFill([
                    'home_team_id' => $home,
                    'away_team_id' => $away,
                ])->save();
            } else {
                $match = FootballMatch::create([
                    'competition_id' => $fixture->competition_id,
                    'season_id' => $fixture->season_id,
                    'round_id' => $fixture->round_id,
                    'group_id' => $fixture->group_id,
                    'home_team_id' => $home,
                    'away_team_id' => $away,
                    'stadium_id' => $fixture->stadium_id,
                    'status' => MatchStatus::Scheduled,
                    'current_period' => 'upcoming',
                    'match_duration_minutes' => $tournament->match_duration_minutes ?: 90,
                    'created_by' => $tournament->organizer_id,
                ]);

                $fixture->forceFill(['match_id' => $match->id])->save();
            }

            return;
        }

        if ($fixture->match_id) {
            FootballMatch::whereKey($fixture->match_id)->delete();
            $fixture->forceFill(['match_id' => null])->save();
        }
    }

    public function deleteGroupFixtures(Tournament $tournament): int
    {
        $competitionId = $tournament->competition_id;
        $seasonId = $tournament->season_id;

        if (! $competitionId || ! $seasonId) {
            return 0;
        }

        $fixtures = Fixture::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $seasonId)
            ->whereNotNull('group_id')
            ->get();

        return $this->deleteFixtureRows($fixtures);
    }

    public function deleteKnockoutFixtures(Tournament $tournament): int
    {
        $competitionId = $tournament->competition_id;
        $seasonId = $tournament->season_id;

        if (! $competitionId || ! $seasonId) {
            return 0;
        }

        $roundIds = Round::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $seasonId)
            ->where('stage', '!=', RoundStage::Group)
            ->pluck('id');

        if ($roundIds->isEmpty()) {
            return 0;
        }

        $fixtures = Fixture::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $seasonId)
            ->whereIn('round_id', $roundIds)
            ->get();

        return $this->deleteFixtureRows($fixtures);
    }

    /**
     * @param  Collection<int, Fixture>  $fixtures
     */
    private function deleteFixtureRows(Collection $fixtures): int
    {
        $matchIds = $fixtures->pluck('match_id')->filter()->values();

        if ($matchIds->isNotEmpty()) {
            FootballMatch::whereKey($matchIds->all())->delete();
        }

        $count = $fixtures->count();

        if ($count > 0) {
            $this->bookings->archiveForFixtures($fixtures->pluck('id'));
            Fixture::whereKey($fixtures->pluck('id')->all())->delete();
        }

        return $count;
    }

    /**
     * @param  array<int, int>  $teamIds
     */
    private function assertKnockoutReady(Tournament $tournament, array $teamIds): void
    {
        if (($tournament->plan['knockout']['mode'] ?? null) === 'groups6') {
            throw new DomainException('أنشئ الأدوار الإقصائية من صفحة السلم بعد اكتمال أدوار المجموعات المصغرة');
        }

        $rounds = Round::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('stage', '!=', RoundStage::Group)
            ->orderBy('order_index')
            ->get();

        if ($rounds->isEmpty()) {
            throw new DomainException(
                $tournament->tournament_format === 'groups_knockout'
                    ? 'أكمل جميع مباريات دور المجموعات لإنشاء الأدوار الإقصائية'
                    : 'صيغة البطولة لا تتضمن أدواراً إقصائية'
            );
        }

        $expected = $this->setup->resolveKnockoutTeams($tournament);

        if (count($teamIds) !== $expected) {
            throw new DomainException("عدد الفرق المتأهلة يجب أن يكون $expected");
        }

        $mode = ($tournament->plan['knockout']['mode'] ?? null);

        if (! $this->bracket->isSixTeamBracket($tournament)
            && ! in_array($mode, ['playin', 'bye_final'], true)
            && ! $this->bracket->isPowerOfTwo($expected)) {
            throw new DomainException('عدد الفرق لا يسمح بسلم إقصائي مباشر — اختر صيغة التوليد (دور تمهيدي أو استراحة للمتصدر)');
        }

        $unique = array_unique(array_map('intval', $teamIds));

        if (count($unique) !== count($teamIds)) {
            throw new DomainException('لا يمكن تكرار نفس الفريق في القائمة');
        }

        $registered = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->pluck('team_id')
            ->all();

        if (array_diff($teamIds, $registered) !== []) {
            throw new DomainException('أحد الفرق المتأهلة غير مسجل في البطولة');
        }
    }

    /**
     * Pure group-stage planner: computes the round-robin pairs and assigns a
     * stadium + datetime to each, honouring the conflict strategy.
     *
     * @param  array<int>|null  $stadiumIds
     * @return array{matches: array<int, array<string, mixed>>, conflicts: int, skipped: int}
     */
    private function planGroupFixtures(
        Tournament $tournament,
        ?string $startsOn,
        ?array $stadiumIds,
        string $defaultTime,
        bool $doubleRoundRobin,
        string $strategy,
    ): array {
        $this->setup->buildStructure($tournament);

        $competitionId = $tournament->competition_id;
        $seasonId = $tournament->season_id;

        $groupRound = Round::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $seasonId)
            ->where('stage', RoundStage::Group)
            ->firstOrFail();

        $groups = Group::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $seasonId)
            ->orderBy('name')
            ->get();

        $stadiumNames = $this->stadiumNames($stadiumIds);

        $startDay = Carbon::parse($startsOn ?? $tournament->start_date?->toDateString() ?? now()->toDateString());
        $matchesPerDay = (int) ($tournament->matches_per_day ?? 0);

        $stadiumSlots = [];
        $teamSlots = [];
        $planned = [];
        $skipped = 0;

        foreach ($groups as $group) {            $teamIds = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->where('group_id', $group->id)
                ->orderBy('group_position')
                ->orderBy('id')
                ->pluck('team_id')
                ->all();

            if (count($teamIds) < 2) {
                continue;
            }

            foreach ($this->roundRobin($teamIds, $doubleRoundRobin) as $roundIndex => $pairs) {
                foreach ($pairs as $pair) {
                    $dayOffset = $matchesPerDay > 0
                        ? intdiv(count($planned), $matchesPerDay)
                        : $roundIndex;

                    $matchDay = $startDay->copy()->addDays($dayOffset);

                    [$stadiumId, $datetime, $conflicts] = $this->resolveSlot(
                        $stadiumIds,
                        $matchDay,
                        $defaultTime,
                        $strategy,
                        $stadiumSlots,
                        $teamSlots,
                        $pair[0],
                        $pair[1],
                    );

                    if (! empty($conflicts)) {
                        if ($strategy === self::STRATEGY_SKIP) {
                            $skipped++;

                            continue;
                        }
                    }

                    $planned[] = [
                        'fixture_id' => null,
                        'group_id' => $group->id,
                        'group_name' => $group->name,
                        'matchday' => $roundIndex + 1,
                        'home_team_id' => $pair[0],
                        'away_team_id' => $pair[1],
                        'stadium_id' => $stadiumId,
                        'stadium_name' => $stadiumId ? ($stadiumNames[$stadiumId] ?? null) : null,
                        'datetime' => $datetime,
                        'date' => $datetime->toDateString(),
                        'time' => $datetime->format('H:i'),
                        'conflicts' => $conflicts,
                    ];

                    if (empty($conflicts)) {
                        $this->reserveInPlan($stadiumSlots, $teamSlots, $stadiumId, $datetime, $pair[0], $pair[1]);
                    }
                }
            }
        }

        return $this->serializePlan($this->withTeamNames($planned), $skipped);
    }

    /**
     * Schedule the knockout first round pairings into planned matches.
     *
     * @param  array<int, array{0: int, 1: int}>  $pairs  ordered [home, away] seeds
     * @param  array<int>|null  $stadiumIds
     * @return array{matches: array<int, array<string, mixed>>, conflicts: int, skipped: int}
     */
    private function planKnockoutPairs(
        Tournament $tournament,
        array $pairs,
        ?string $startsOn,
        ?array $stadiumIds,
        string $defaultTime,
        string $strategy,
    ): array {
        $firstRound = Round::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('stage', '!=', RoundStage::Group)
            ->orderBy('order_index')
            ->first();

        if (! $firstRound) {
            throw new DomainException('لا توجد أدوار إقصائية في هذه البطولة');
        }

        $stadiumNames = $this->stadiumNames($stadiumIds);
        $startDay = Carbon::parse($startsOn ?? $tournament->start_date?->toDateString() ?? now()->toDateString());
        $matchesPerDay = (int) ($tournament->matches_per_day ?? 0);

        $stadiumSlots = [];
        $teamSlots = [];
        $planned = [];
        $skipped = 0;

        foreach ($pairs as $index => [$home, $away]) {
            $dayOffset = $matchesPerDay > 0 ? intdiv($index, $matchesPerDay) : $index;
            $matchDay = $startDay->copy()->addDays($dayOffset);

            [$stadiumId, $datetime, $conflicts] = $this->resolveSlot(
                $stadiumIds,
                $matchDay,
                $defaultTime,
                $strategy,
                $stadiumSlots,
                $teamSlots,
                $home,
                $away,
            );

            if (! empty($conflicts) && $strategy === self::STRATEGY_SKIP) {
                $skipped++;

                continue;
            }

            $planned[] = [
                'round_id' => $firstRound->id,
                'round_name' => $firstRound->name,
                'group_id' => null,
                'group_name' => null,
                'matchday' => $index + 1,
                'home_team_id' => $home,
                'away_team_id' => $away,
                'stadium_id' => $stadiumId,
                'stadium_name' => $stadiumId ? ($stadiumNames[$stadiumId] ?? null) : null,
                'datetime' => $datetime,
                'date' => $datetime->toDateString(),
                'time' => $datetime->format('H:i'),
                'conflicts' => $conflicts,
            ];

            if (empty($conflicts)) {
                $this->reserveInPlan($stadiumSlots, $teamSlots, $stadiumId, $datetime, $home, $away);
            }
        }

        return $this->serializePlan($this->withTeamNames($planned), $skipped);
    }

    /**
     * First knockout round pairings following the standard seeding pattern:
     * the top seed plays the bottom seed, then the next top faces the next
     * bottom, and so on (1-vs-N, 2-vs-N-1, ...).
     *
     * @param  array<int, int>  $seeds
     * @return array<int, array{0: int, 1: int}>
     */
    private function pairsFromSeeds(array $seeds): array
    {
        $count = count($seeds);
        $pairs = [];

        for ($i = 0; $i < $count / 2; $i++) {
            $pairs[] = [$seeds[$i], $seeds[$count - 1 - $i]];
        }

        return $pairs;
    }

    /**
     * Knockout first-round pairings following the chosen bracket mode. The
     * standard 6-team byes bracket only plays 3-vs-6 and 4-vs-5. A play-in
     * mode pairs the bottom seeds only; a balanced-byes mode skips the top
     * ranked qualifier (its bye is the last slot of the round).
     *
     * @param  array<int, int>  $seeds
     * @return array<int, array{0: int, 1: int}>
     */
    private function knockoutPairs(Tournament $tournament, array $seeds): array
    {
        $mode = $this->knockoutMode($tournament);

        if ($mode === 'playin') {
            $sizes = $this->setup->playInSizes(count($seeds));

            return $this->pairsFromSeeds(array_slice($seeds, $sizes['byes'], $sizes['matches'] * 2));
        }

        if ($mode === 'bye_final') {
            return $this->bracket->firstRoundPairsForByeFinal($seeds);
        }

        if ($this->bracket->isSixTeamBracket($tournament)) {
            $seed = array_values(array_slice($seeds, 0, 6));

            if (count($seed) === 6) {
                return [
                    [$seed[2], $seed[5]],
                    [$seed[3], $seed[4]],
                ];
            }
        }

        return $this->pairsFromSeeds($seeds);
    }

    /**
     * Effective knockout bracket mode: the persisted plan choice wins, falling
     * back to the standard 6-team byes bracket for team-of-six tournaments.
     */
    private function knockoutMode(Tournament $tournament): ?string
    {
        return ($tournament->plan['knockout']['mode'] ?? null)
            ?? ($this->bracket->isSixTeamBracket($tournament) ? 'byes' : null);
    }

    /**
     * @param  array<int, array<string, mixed>>  $planned
     * @return array{matches: array<int, array<string, mixed>>, conflicts: int, skipped: int}
     */
    private function serializePlan(array $planned, int $skipped): array
    {
        $conflicts = 0;

        foreach ($planned as $match) {
            if (! empty($match['conflicts'])) {
                $conflicts++;
            }
        }

        return [
            'matches' => $planned,
            'conflicts' => $conflicts,
            'skipped' => $skipped,
        ];
    }

    /**
     * @param  array{matches: array<int, array<string, mixed>>, conflicts: int, skipped: int}  $plan
     */
    private function conflictErrorMessage(array $plan): string
    {
        $reasons = [];

        foreach ($plan['matches'] as $match) {
            foreach ($match['conflicts'] as $reason) {
                if (! in_array($reason, $reasons, true)) {
                    $reasons[] = $reason;
                }
            }
        }

        $summary = $plan['conflicts'] === 1 ? 'تعارض واحد' : $plan['conflicts'].' تعارضات';

        if ($reasons === []) {
            return "تعذر إنشاء البرنامج بسبب $summary";
        }

        return "تعذر إنشاء البرنامج بسبب $summary: ".implode(' — ', $reasons);
    }

    /**
     * @param  array<int, array<string, mixed>>  $plan
     * @return array{generated: int, conflicts: int, skipped: int, matches: array<int, array<string, mixed>>}
     */
    private function persistPlan(Tournament $tournament, array $plan): array
    {
        $created = [];
        $stadiumNames = $this->stadiumNames(
            array_values(array_unique(array_filter(array_column($plan['matches'], 'stadium_id'))))
        );

        $groupRound = Round::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('stage', RoundStage::Group)
            ->firstOrFail();

        foreach ($plan['matches'] as $match) {
            $group = Group::query()->find($match['group_id']);

            $footballMatch = FootballMatch::create([
                'competition_id' => $tournament->competition_id,
                'season_id' => $tournament->season_id,
                'round_id' => $groupRound->id,
                'group_id' => $match['group_id'],
                'home_team_id' => $match['home_team_id'],
                'away_team_id' => $match['away_team_id'],
                'stadium_id' => $match['stadium_id'],
                'status' => MatchStatus::Scheduled,
                'current_period' => 'upcoming',
                'match_duration_minutes' => $tournament->match_duration_minutes ?: 90,
                'created_by' => $tournament->organizer_id,
            ]);

            $fixture = Fixture::create([
                'competition_id' => $tournament->competition_id,
                'season_id' => $tournament->season_id,
                'round_id' => $groupRound->id,
                'matchday' => $match['matchday'],
                'group_id' => $match['group_id'],
                'match_id' => $footballMatch->id,
                'stadium_id' => $match['stadium_id'],
                'home_team_id' => $match['home_team_id'],
                'away_team_id' => $match['away_team_id'],
                'scheduled_at' => $match['datetime'],
                'status' => FixtureStatus::Scheduled,
            ]);

            $this->bookings->createForFixture($tournament, $fixture);

            $created[] = [
                'id' => $fixture->id,
                'match_id' => $footballMatch->id,
                'group_id' => $match['group_id'],
                'group_name' => $group?->name ?? $match['group_name'],
                'matchday' => $match['matchday'],
                'home_team_id' => $match['home_team_id'],
                'away_team_id' => $match['away_team_id'],
                'stadium_id' => $match['stadium_id'],
                'stadium_name' => $match['stadium_id'] ? ($stadiumNames[$match['stadium_id']] ?? null) : null,
                'scheduled_at' => $match['datetime']->toIso8601String(),
            ];
        }

        return [
            'generated' => count($created),
            'conflicts' => $plan['conflicts'],
            'skipped' => $plan['skipped'],
            'matches' => $created,
        ];
    }

    /**
     * Pick the stadium + datetime for one match at its preferred day.
     *
     * @param  array<int>|null  $stadiumIds
     * @param  array<int, array<string, true>>  $stadiumSlots
     * @param  array<int, array<int, Carbon>>  $teamSlots
     * @return array{0: int|null, 1: Carbon, 2: array<int, string>}
     */
    private function resolveSlot(
        ?array $stadiumIds,
        Carbon $preferredDay,
        string $defaultTime,
        string $strategy,
        array &$stadiumSlots,
        array &$teamSlots,
        int $homeTeamId,
        int $awayTeamId,
    ): array {
        if ($strategy === self::STRATEGY_AUTO_ROLL) {
            return $this->autoRollSlot($stadiumIds, $preferredDay, $defaultTime, $stadiumSlots, $teamSlots, $homeTeamId, $awayTeamId);
        }

        $preferred = Carbon::parse($preferredDay->toDateString().' '.$defaultTime.':00');
        $conflicts = [];
        $chosenStadium = null;

        if (! empty($stadiumIds)) {
            foreach ($stadiumIds as $stadiumId) {
                if ($this->slotFree($stadiumId, $preferred, $stadiumSlots)) {
                    $chosenStadium = $stadiumId;

                    break;
                }
            }

            if ($chosenStadium === null) {
                $conflicts[] = 'جميع الملاعب المحددة محجوزة في هذا التوقيت';
            }
        }

        if (! $this->teamFree($homeTeamId, $preferred, $teamSlots)) {
            $conflicts[] = 'الفريق المضيف لديه مباراة أخرى في هذا التوقيت';
        }

        if (! $this->teamFree($awayTeamId, $preferred, $teamSlots)) {
            $conflicts[] = 'الفريق الضيف لديه مباراة أخرى في هذا التوقيت';
        }

        return [$chosenStadium, $preferred, $conflicts];
    }

    /**
     * Walk forward through candidate slots (stadium rotation, +2h steps, then
     * next days) until a fully free one is found.
     *
     * @param  array<int>|null  $stadiumIds
     * @param  array<int, array<string, true>>  $stadiumSlots
     * @param  array<int, array<int, Carbon>>  $teamSlots
     * @return array{0: int|null, 1: Carbon, 2: array<int, string>}
     */
    private function autoRollSlot(
        ?array $stadiumIds,
        Carbon $preferredDay,
        string $defaultTime,
        array &$stadiumSlots,
        array &$teamSlots,
        int $homeTeamId,
        int $awayTeamId,
    ): array {
        $cursor = Carbon::parse($preferredDay->toDateString().' '.$defaultTime.':00');
        $last = $cursor->copy();

        for ($attempt = 0; $attempt < 90; $attempt++) {
            $last = $cursor->copy();

            if (empty($stadiumIds)) {
                if ($this->teamFree($homeTeamId, $cursor, $teamSlots) && $this->teamFree($awayTeamId, $cursor, $teamSlots)) {
                    return [null, $cursor, []];
                }
            } else {
                foreach ($stadiumIds as $stadiumId) {
                    if ($this->slotFree($stadiumId, $cursor, $stadiumSlots)
                        && $this->teamFree($homeTeamId, $cursor, $teamSlots)
                        && $this->teamFree($awayTeamId, $cursor, $teamSlots)) {
                        return [$stadiumId, $cursor, []];
                    }
                }
            }

            $cursor->addHours(2);

            $hour = (int) $cursor->format('H');

            if ($hour === 0 || $hour >= 22) {
                [$h, $m] = array_map('intval', explode(':', $defaultTime));
                $cursor->setTime($h, $m)->addDay();
            }
        }

        return [null, $last, ['لم يتم العثور على توقيت متاح خلال هذه الفترة']];
    }

    /**
     * @param  array<int, array<string, true>>  $stadiumSlots
     */
    private function slotFree(int $stadiumId, Carbon $datetime, array &$stadiumSlots): bool
    {
        $key = $datetime->format('Y-m-d H:i:00');

        if (isset($stadiumSlots[$stadiumId][$key])) {
            return false;
        }

        $time = $datetime->format('H:i');

        if (TerrainBooking::getConflictMessage($stadiumId, $datetime->toDateString(), $time, $this->endTimeFor($time))) {
            return false;
        }

        return ! $this->stadiumHasFixtureConflict($stadiumId, $datetime);
    }

    /**
     * True when another tournament fixture already occupies the stadium within
     * the match window. Tournament schedules live on the fixtures table.
     */
    private function stadiumHasFixtureConflict(int $stadiumId, Carbon $datetime, ?int $excludeMatchId = null): bool
    {
        $window = PlayerMatchGuard::MATCH_WINDOW_HOURS;

        return Fixture::query()
            ->whereIn('competition_id', $this->activeTournamentCompetitionIds())
            ->where('stadium_id', $stadiumId)
            ->where('scheduled_at', '>', $datetime->copy()->subHours($window))
            ->where('scheduled_at', '<', $datetime->copy()->addHours($window))
            ->whereNotIn('status', [FixtureStatus::Postponed->value, FixtureStatus::Cancelled->value])
            ->whereDoesntHave('match', fn ($q) => $q->whereIn('status', [MatchStatus::Finished->value, MatchStatus::Cancelled->value]))
            ->when($excludeMatchId, fn ($q) => $q->where('match_id', '!=', $excludeMatchId))
            ->exists();
    }

    /**
     * Competition ids that currently hold active (non-finished, non-cancelled)
     * tournaments. Fixtures of finished tournaments must not block terrains,
     * ditto bookings are archived when the tournament completes.
     *
     * @return array<int, int>
     */
    private function activeTournamentCompetitionIds(): array
    {
        if ($this->activeTournamentCompetitionIdsCache !== null) {
            return $this->activeTournamentCompetitionIdsCache;
        }

        return $this->activeTournamentCompetitionIdsCache = Tournament::query()
            ->whereNotIn('status', [Tournament::STATUS_COMPLETED, Tournament::STATUS_CANCELLED])
            ->whereNotNull('competition_id')
            ->pluck('competition_id')
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  array<int, array<int, Carbon>>  $teamSlots
     */
    private function teamFree(int $teamId, Carbon $datetime, array &$teamSlots): bool
    {
        $windowMinutes = PlayerMatchGuard::MATCH_WINDOW_HOURS * 60;

        foreach ($teamSlots[$teamId] ?? [] as $existing) {
            if (abs((int) $existing->diffInMinutes($datetime)) < $windowMinutes) {
                return false;
            }
        }

        return ! MatchMembershipService::teamHasMatchConflict($teamId, $datetime);
    }

    /**
     * @param  array<int, array<string, true>>  $stadiumSlots
     * @param  array<int, array<int, Carbon>>  $teamSlots
     */
    private function reserveInPlan(
        array &$stadiumSlots,
        array &$teamSlots,
        ?int $stadiumId,
        Carbon $datetime,
        int $homeTeamId,
        int $awayTeamId,
    ): void {
        if ($stadiumId !== null) {
            $stadiumSlots[$stadiumId][$datetime->format('Y-m-d H:i:00')] = true;
        }

        $teamSlots[$homeTeamId][] = $datetime->copy();
        $teamSlots[$awayTeamId][] = $datetime->copy();
    }

    /**
     * @param  array<int>|null  $stadiumIds
     * @return array<int, string>
     */
    private function stadiumNames(?array $stadiumIds): array
    {
        if (empty($stadiumIds)) {
            return [];
        }

        return Stadium::query()->whereKey($stadiumIds)->pluck('name', 'id')->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $matches
     * @return array<int, array<string, mixed>>
     */
    private function withTeamNames(array $matches): array
    {
        $ids = [];

        foreach ($matches as $match) {
            if ($match['home_team_id']) {
                $ids[$match['home_team_id']] = true;
            }

            if ($match['away_team_id']) {
                $ids[$match['away_team_id']] = true;
            }
        }

        if ($ids === []) {
            return $matches;
        }

        $names = Team::query()->whereKey(array_keys($ids))->pluck('name', 'id')->all();

        foreach ($matches as &$match) {
            $match['home_team_name'] = $match['home_team_id'] ? ($names[$match['home_team_id']] ?? null) : null;
            $match['away_team_name'] = $match['away_team_id'] ? ($names[$match['away_team_id']] ?? null) : null;
        }

        return $matches;
    }

    private function endTimeFor(string $startTime): string
    {
        return Carbon::parse($startTime)->addHours(2)->format('H:i');
    }

    /**
     * Returns the tournament's round structure (group matchdays + knockout rounds)
     * with per-round status counters. Used to drive the committee matches navigation.
     *
     * @return array{
     *     group_stage: array<int, array<string, mixed>>,
     *     knockout: array<int, array<string, mixed>>,
     * }
     */
    public function matchRounds(Tournament $tournament): array
    {
        if (! $tournament->competition_id || ! $tournament->season_id) {
            return ['group_stage' => [], 'knockout' => []];
        }

        $competitionId = $tournament->competition_id;
        $seasonId = $tournament->season_id;

        $rounds = Round::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $seasonId)
            ->orderBy('order_index')
            ->get();

        $groupStage = [];
        $matchdays = Fixture::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $seasonId)
            ->whereNotNull('matchday')
            ->distinct()
            ->orderBy('matchday')
            ->pluck('matchday');

        foreach ($matchdays as $matchday) {
            $groupStage[] = array_merge(
                ['matchday' => (int) $matchday],
                $this->roundCounts($tournament, ['matchday' => (int) $matchday]),
            );
        }

        $knockout = [];
        foreach ($rounds->where('stage', '!=', RoundStage::Group) as $round) {
            $knockout[] = array_merge([
                'round_id' => $round->id,
                'stage' => $round->stage->value,
                'name' => $round->name,
                'status' => $round->status ?? Round::STATUS_LOCKED,
                'order_index' => $round->order_index,
            ], $this->roundCounts($tournament, ['round_id' => $round->id]));
        }

        return [
            'group_stage' => $groupStage,
            'knockout' => $knockout,
        ];
    }

    /**
     * @param  array{matchday?: int, round_id?: int}  $scopes
     * @return array{total: int, completed: int, live: int, upcoming: int, pending: int, postponed: int, cancelled: int}
     */
    private function roundCounts(Tournament $tournament, array $scopes): array
    {
        $query = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id);

        if (isset($scopes['matchday'])) {
            $query->where('matchday', $scopes['matchday']);
        }

        if (isset($scopes['round_id'])) {
            $query->where('round_id', $scopes['round_id']);
        }

        $fixtures = $query->get(['id', 'status', 'match_id', 'scheduled_at']);

        $matchIds = $fixtures->pluck('match_id')->filter()->values();
        $matchStatuses = $matchIds->isNotEmpty()
            ? FootballMatch::query()->whereKey($matchIds->all())->pluck('status', 'id')
            : collect();

        $now = now();
        $counts = [
            'total' => $fixtures->count(),
            'completed' => 0,
            'live' => 0,
            'upcoming' => 0,
            'pending' => 0,
            'postponed' => 0,
            'cancelled' => 0,
        ];

        foreach ($fixtures as $fixture) {
            $fixtureStatus = $fixture->status?->value;

            if ($fixtureStatus === FixtureStatus::Postponed->value) {
                $counts['postponed']++;

                continue;
            }

            if ($fixtureStatus === FixtureStatus::Cancelled->value) {
                $counts['cancelled']++;

                continue;
            }

            $matchStatus = $matchStatuses->get($fixture->match_id);
            $matchStatus = $matchStatus instanceof MatchStatus ? $matchStatus->value : $matchStatus;

            if ($matchStatus === MatchStatus::Finished->value) {
                $counts['completed']++;

                continue;
            }

            if (in_array($matchStatus, MatchStatus::live(), true)) {
                $counts['live']++;

                continue;
            }

            if ($fixture->scheduled_at && $fixture->scheduled_at->isAfter($now)) {
                $counts['upcoming']++;

                continue;
            }

            $counts['pending']++;
        }

        return $counts;
    }

    /**
     * @param  array<int, int>  $teamIds
     * @return array<int, array<int, array{0: int, 1: int}>>
     */
    private function roundRobin(array $teamIds, bool $doubleRoundRobin = false): array
    {
        if (count($teamIds) < 2) {
            throw new DomainException('المجموعة يجب أن تضم فريقين على الأقل');
        }

        $teams = array_values($teamIds);
        $count = count($teams);

        if ($count % 2 === 1) {
            $teams[] = null;
            $count++;
        }

        $roundCount = $count - 1;
        $pairsPerRound = intdiv($count, 2);
        $singleSchedules = [];

        for ($round = 0; $round < $roundCount; $round++) {
            $pairs = [];

            for ($i = 0; $i < $pairsPerRound; $i++) {
                $home = $teams[$i];
                $away = $teams[$count - 1 - $i];

                if ($home !== null && $away !== null) {
                    $pairs[] = [$home, $away];
                }
            }

            $singleSchedules[] = $pairs;

            $last = array_pop($teams);
            array_splice($teams, 1, 0, [$last]);
        }

        if (! $doubleRoundRobin) {
            return $singleSchedules;
        }

        // Double round-robin: second leg is separate rounds (round N+1 … 2N), swapped home/away
        $doubleSchedules = [];
        foreach ($singleSchedules as $pairs) {
            $swapped = [];
            foreach ($pairs as [$home, $away]) {
                $swapped[] = [$away, $home];
            }
            $doubleSchedules[] = $swapped;
        }

        return array_merge($singleSchedules, $doubleSchedules);
    }
}
