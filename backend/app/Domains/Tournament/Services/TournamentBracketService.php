<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Enums\RoundStage;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Competition\Models\Group;
use App\Domains\Competition\Models\Round;
use App\Domains\Competition\Models\Season;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use Illuminate\Support\Facades\DB;

class TournamentBracketService
{
    public function __construct(
        private readonly TournamentSetupService $setup,
        private readonly TournamentStandingsService $standings,
    ) {}

    /**
     * @return array<int, array{round_id: int, name: string, stage: string, status: string, fixtures: array<int, array<string, mixed>>}>
     */
    public function generateBracket(Tournament $tournament, ?string $mode = null): array
    {
        return DB::transaction(function () use ($tournament, $mode) {
            $this->setup->buildStructure($tournament);

            $season = $tournament->season ?: Season::find($tournament->season_id);

            $six = $this->isSixTeamBracket($tournament);
            $effectiveMode = $six ? ($mode ?: (($tournament->plan ?? [])['knockout']['mode'] ?? 'byes')) : null;

            $this->setup->ensureKnockoutRounds($tournament, $season, $effectiveMode);

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

            $expectedCounts = match ($effectiveMode) {
                'byes' => [4, 2, 1],
                'groups6' => [2, 1],
                default => $this->halvingCounts($this->setup->resolveKnockoutTeams($tournament)),
            };

            $fixturesByRound = [];

            foreach ($rounds as $index => $round) {
                $expected = $expectedCounts[$index] ?? 0;
                $existingCount = Fixture::query()->where('round_id', $round->id)->count();

                for ($i = $existingCount; $i < $expected; $i++) {
                    Fixture::create([
                        'competition_id' => $tournament->competition_id,
                        'season_id' => $tournament->season_id,
                        'round_id' => $round->id,
                        'group_id' => null,
                        'home_team_id' => null,
                        'away_team_id' => null,
                        'status' => FixtureStatus::Scheduled,
                    ]);
                }

                $fixturesByRound[$round->id] = Fixture::query()
                    ->where('round_id', $round->id)
                    ->orderBy('id')
                    ->pluck('id')
                    ->values()
                    ->all();
            }

            $this->wireBracketSources($rounds, $fixturesByRound);

            if ($effectiveMode === 'byes') {
                $this->wireSixByesSources($fixturesByRound);
            }

            $plan = $tournament->plan ?? [];
            $plan['bracket'] = [
                'rounds' => $rounds->map(fn (Round $round) => [
                    'round_id' => $round->id,
                    'stage' => $round->stage->value,
                    'name' => $round->name,
                    'order_index' => $round->order_index,
                ])->all(),
            ];

            if ($six) {
                $plan['knockout'] = array_merge($plan['knockout'] ?? [], ['mode' => $effectiveMode]);
            }

            $tournament->forceFill(['plan' => $plan])->save();

            return $this->bracket($tournament);
        });
    }

    /**
     * Build the Option B structure: seed the six registered teams into two
     * mini-groups (A/B) so the committee generates round-robin fixtures for each
     * and then populates the semis from the mini-group standings.
     *
     * @return array<int, array{round_id: int, name: string, stage: string, status: string, fixtures: array<int, array<string, mixed>>}>
     */
    public function generateGroups6(Tournament $tournament): array
    {
        return DB::transaction(function () use ($tournament) {
            if (! $this->isSixTeamBracket($tournament)) {
                throw new DomainException('صيغة توليد الأدوار من مجموعات مصغرة غير متاحة لهذه البطولة');
            }

            $seeds = array_slice($this->qualifiedTeamIds($tournament), 0, 6);

            $this->generateBracket($tournament, 'groups6');
            $this->seedGroups6($tournament, $seeds);

            return $this->bracket($tournament);
        });
    }

    /**
     * Populate the Option B semis from the mini-group standings: A1 vs B2 and
     * B1 vs A2. Guarded so it only runs once the whole mini-group round-robin is
     * finished.
     *
     * @return array<int, array{round_id: int, name: string, stage: string, status: string, fixtures: array<int, array<string, mixed>>}>
     */
    public function populateGroups6(Tournament $tournament): array
    {
        return DB::transaction(function () use ($tournament) {
            $plan = $tournament->plan ?? [];
            $groups6 = $plan['knockout']['groups'] ?? null;

            if (! $groups6 || count($groups6) !== 2) {
                throw new DomainException('لم تُنشأ المجموعات المصغرة بعد — أنشئ السلم أولاً من صفحة السلم');
            }

            if (! $this->setup->groupStageComplete($tournament)) {
                throw new DomainException('أكمل جميع مباريات أدوار المجموعات المصغرة قبل تعبئة المتأهلين');
            }

            $standings = $this->standings->standingsInGroups($tournament, array_column($groups6, 'id'));
            $byGroup = [];

            foreach ($standings['groups'] as $group) {
                $byGroup[$group['group_id']] = $group['rows'];
            }

            $a = $byGroup[(int) $groups6[0]['id']] ?? [];
            $b = $byGroup[(int) $groups6[1]['id']] ?? [];

            if (count($a) < 2 || count($b) < 2) {
                throw new DomainException('لا تكفي الفرق المصنفة في المجموعات المصغرة للتأهل إلى الأدوار الإقصائية');
            }

            $pairs = [
                ['home' => (int) $a[0]['team_id'], 'away' => (int) $b[1]['team_id']],
                ['home' => (int) $b[0]['team_id'], 'away' => (int) $a[1]['team_id']],
            ];

            $firstRound = Round::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->where('stage', '!=', RoundStage::Group)
                ->orderBy('order_index')
                ->first();

            if (! $firstRound) {
                throw new DomainException('لا توجد أدوار إقصائية في هذه البطولة');
            }

            $fixtures = Fixture::query()
                ->where('round_id', $firstRound->id)
                ->orderBy('id')
                ->get();

            foreach ($fixtures as $index => $fixture) {
                $pair = $pairs[$index] ?? null;

                if (! $pair) {
                    break;
                }

                $fixture->forceFill([
                    'home_team_id' => $pair['home'],
                    'away_team_id' => $pair['away'],
                    'bye_team_id' => null,
                    'status' => FixtureStatus::Scheduled,
                ])->save();

                $this->ensureMatch($tournament, $fixture);
            }

            $this->rebuildBracket($tournament);

            return $this->bracket($tournament);
        });
    }

    /**
     * Pre-generation gate used by the committee bracket page: tells the client
     * exactly how many teams enter the knockout and, for the supported
     * non-group formats, whether the count opens a choice (6-team) or is simply
     * invalid for a straight bracket.
     *
     * @return array{count: int, status: string, options: array<int, string>}
     */
    public function knockoutValidation(Tournament $tournament): array
    {
        if ($tournament->tournament_format === 'groups_knockout') {
            return [
                'count' => $this->effectiveKnockoutCount($tournament),
                'status' => 'ok',
                'options' => [],
            ];
        }

        if (in_array($tournament->tournament_format, ['groups_only', 'league'], true)) {
            return [
                'count' => 0,
                'status' => 'ok',
                'options' => [],
            ];
        }

        $count = count($this->qualifiedTeamIds($tournament));
        $expected = $this->effectiveKnockoutCount($tournament);

        if ($count === $expected && in_array($count, [2, 4, 8, 16, 32], true)) {
            return [
                'count' => $count,
                'status' => 'ok',
                'options' => [],
            ];
        }

        if ($count === 6 && $expected === 6) {
            return [
                'count' => 6,
                'status' => 'choice',
                'options' => ['standard_byes', 'groups6'],
            ];
        }

        return [
            'count' => $count,
            'status' => 'invalid',
            'options' => [],
        ];
    }

    /**
     * Registered teams ordered by their draw position (used as the knockout
     * seed order for formats without a group stage).
     *
     * @return array<int, int>
     */
    public function qualifiedTeamIds(Tournament $tournament): array
    {
        return $this->knockoutTeamIds($tournament);
    }

    /**
     * Size of the knockout stage as guaranteed by the tournament structure
     * (drives round layout and the fixtures-tab expected count).
     */
    public function effectiveKnockoutCount(Tournament $tournament): int
    {
        return $this->setup->resolveKnockoutTeams($tournament);
    }

    /**
     * Sidecar metadata for the bracket page: which 6-team generator was used
     * and, for Option B, the mini-groups with their seeded teams.
     *
     * @return array{mode: string, groups: array<int, array<string, mixed>>|null}|null
     */
    public function bracketMeta(Tournament $tournament): ?array
    {
        $plan = $tournament->plan ?? [];
        $knockout = $plan['knockout'] ?? null;

        if (! $knockout || ! isset($knockout['mode'])) {
            return null;
        }

        $groups = null;

        if ($knockout['mode'] === 'groups6' && isset($knockout['groups'])) {
            $teams = [];

            foreach ($knockout['groups'] as $group) {
                $ids = $group['team_ids'] ?? [];
                $models = $ids ? Team::query()->withTrashed()->whereKey($ids)->get(['id', 'name', 'logo_path']) : collect();

                $teams[] = [
                    'id' => $group['id'],
                    'name' => $group['name'],
                    'teams' => $models->map(fn (Team $team) => [
                        'id' => $team->id,
                        'name' => $team->name,
                        'logo_url' => $team->logo_url,
                    ])->values()->all(),
                ];
            }

            $groups = $teams;
        }

        return [
            'mode' => $knockout['mode'],
            'groups' => $groups,
        ];
    }

    /**
     * @param  array<int, int>  $qualified  team ids ordered by rank (1st, 2nd, ...)
     * @return array<int, array{round_id: int, name: string, stage: string, status: string, fixtures: array<int, array<string, mixed>>}>
     */
    public function populateKnockout(Tournament $tournament, array $qualified, ?string $mode = null): array
    {
        return DB::transaction(function () use ($tournament, $qualified, $mode) {
            $this->generateBracket($tournament, $mode);

            $firstRound = Round::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->where('stage', '!=', RoundStage::Group)
                ->orderBy('order_index')
                ->first();

            if (! $firstRound) {
                throw new DomainException('لا توجد أدوار إقصائية في هذه البطولة');
            }

            $fixtures = Fixture::query()
                ->where('round_id', $firstRound->id)
                ->orderBy('id')
                ->get();

            if ($this->isSixTeamBracket($tournament)) {
                return $this->populateSixByes($tournament, $fixtures, array_values($qualified));
            }

            if (count($qualified) !== $fixtures->count() * 2) {
                throw new DomainException('عدد الفرق المتأهلة لا يطابق حجم الدور الأول ('.($fixtures->count() * 2).')');
            }

            $fixtureCount = $fixtures->count();

            foreach ($fixtures as $index => $fixture) {
                $fixture->forceFill([
                    'home_team_id' => $qualified[$index],
                    'away_team_id' => $qualified[$fixtureCount * 2 - 1 - $index],
                ])->save();

                $this->ensureMatch($tournament, $fixture);
            }

            return $this->bracket($tournament);
        });
    }

    /**
     * Standard 6-team bracket: QF pairs top-3 vs bottom-1 (3-vs-6, 4-vs-5)
     * plus two seeded byes (1st, 2nd) that enter the semis directly.
     *
     * @param  \Illuminate\Support\Collection<int, Fixture>  $fixtures
     * @param  array<int, int>  $seeds
     * @return array<int, array{round_id: int, name: string, stage: string, status: string, fixtures: array<int, array<string, mixed>>}>
     */
    private function populateSixByes(Tournament $tournament, $fixtures, array $seeds): array
    {
        $seeds = array_slice(array_values($seeds), 0, 6);

        if (count($seeds) !== 6) {
            throw new DomainException('عدد الفرق المتأهلة لا يطابق حجم السداسي (6)');
        }

        $order = collect($fixtures)->values();

        [$qf1, $qf2, $bye1, $bye2] = [$order[0] ?? null, $order[1] ?? null, $order[2] ?? null, $order[3] ?? null];

        if (! $qf1 || ! $qf2 || ! $bye1 || ! $bye2) {
            throw new DomainException('بنية السداسي غير مكتملة — أعد إنشاء السلم');
        }

        $qf1->forceFill(['home_team_id' => $seeds[2], 'away_team_id' => $seeds[5], 'bye_team_id' => null, 'status' => FixtureStatus::Scheduled])->save();
        $qf2->forceFill(['home_team_id' => $seeds[3], 'away_team_id' => $seeds[4], 'bye_team_id' => null, 'status' => FixtureStatus::Scheduled])->save();
        $bye1->forceFill(['home_team_id' => null, 'away_team_id' => null, 'bye_team_id' => $seeds[0], 'status' => FixtureStatus::Bye])->save();
        $bye2->forceFill(['home_team_id' => null, 'away_team_id' => null, 'bye_team_id' => $seeds[1], 'status' => FixtureStatus::Bye])->save();

        $this->ensureMatch($tournament, $qf1);
        $this->ensureMatch($tournament, $qf2);

        $this->rebuildBracket($tournament);

        return $this->bracket($tournament);
    }

    /**
     * Advance the bracket after a knockout result: recompute every slot from its
     * source winners (idempotent) and refresh round states. Safe to call
     * repeatedly; never creates duplicates because each slot is derived.
     */
    public function progress(Fixture $fixture, Tournament $tournament): void
    {
        if (! $fixture->round_id
            || ! $fixture->round
            || $fixture->round->stage === RoundStage::Group) {
            return;
        }

        $this->rebuildBracket($tournament);
        $this->syncRoundStatuses($tournament);
    }

    /**
     * Full idempotent recovery pass: recompute every knockout slot from the
     * finished state of its sources, then sync round states. Used by the
     * explicit "sync" committee action (also covers refresh during progression).
     *
     * @return array<int, array{round_id: int, name: string, stage: string, status: string, fixtures: array<int, array<string, mixed>>}>
     */
    public function progressAll(Tournament $tournament): array
    {
        return DB::transaction(function () use ($tournament) {
            $this->rebuildBracket($tournament);
            $this->syncRoundStatuses($tournament);

            return $this->bracket($tournament);
        });
    }

    /**
     * Recompute every knockout fixture slot from the winner of its explicit
     * source fixtures. Idempotent by construction. Throws when a winner change
     * would corrupt a downstream match that already started or finished.
     */
    public function rebuildBracket(Tournament $tournament): void
    {
        $rounds = Round::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('stage', '!=', RoundStage::Group)
            ->orderBy('order_index')
            ->get()
            ->values();

        if ($rounds->count() < 2) {
            return;
        }

        $previous = Fixture::query()
            ->with('match')
            ->where('round_id', $rounds[0]->id)
            ->orderBy('id')
            ->get()
            ->values();

        for ($i = 1; $i < $rounds->count(); $i++) {
            $current = Fixture::query()
                ->with('match')
                ->where('round_id', $rounds[$i]->id)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->values();

            $previousById = $previous->keyBy('id');

            foreach ($current as $index => $fixture) {
                $homeSource = $fixture->source_home_fixture_id
                    ? ($previousById[$fixture->source_home_fixture_id] ?? null)
                    : ($previous[$index * 2] ?? null);
                $awaySource = $fixture->source_away_fixture_id
                    ? ($previousById[$fixture->source_away_fixture_id] ?? null)
                    : ($previous[$index * 2 + 1] ?? null);

                $homeWinner = $homeSource?->bye_team_id ?: $homeSource?->match?->winner_team_id;
                $awayWinner = $awaySource?->bye_team_id ?: $awaySource?->match?->winner_team_id;

                if (! $homeWinner && ! $awayWinner) {
                    continue;
                }

                $targetHome = $homeWinner ? (int) $homeWinner : $fixture->home_team_id;
                $targetAway = $awayWinner ? (int) $awayWinner : $fixture->away_team_id;

                $match = $fixture->match;
                $matchStatus = $match?->status;
                $matchStatus = $matchStatus instanceof MatchStatus ? $matchStatus->value : $matchStatus;

                if ($match
                    && in_array($matchStatus, [MatchStatus::Finished->value, ...MatchStatus::live()], true)
                    && ((int) $fixture->home_team_id !== $targetHome || (int) $fixture->away_team_id !== $targetAway)) {
                    throw new DomainException('لا يمكن تغيير نتيجة هذا الدور لأن مباراة الدور التالي بدأت أو انتهت بالفعل');
                }

                $changed = false;

                if ($homeWinner && (int) $fixture->home_team_id !== $targetHome) {
                    $fixture->home_team_id = $targetHome;
                    $changed = true;
                }

                if ($awayWinner && (int) $fixture->away_team_id !== $targetAway) {
                    $fixture->away_team_id = $targetAway;
                    $changed = true;
                }

                if ($changed) {
                    $fixture->save();

                    if ($match && in_array($matchStatus, [MatchStatus::Scheduled->value, MatchStatus::Postponed->value], true)) {
                        $match->forceFill([
                            'home_team_id' => $targetHome,
                            'away_team_id' => $targetAway,
                        ])->save();
                    }
                }

                if ($targetHome && $targetAway) {
                    $this->ensureMatch($tournament, $fixture);
                }
            }

            $previous = $current;
        }
    }

    /**
     * Recompute and persist every round state: locked (previous stage not
     * complete), available (ready), in_progress (started/partially played),
     * completed (all fixtures closed).
     */
    public function syncRoundStatuses(Tournament $tournament): void
    {
        if (! $tournament->competition_id || ! $tournament->season_id) {
            return;
        }

        $rounds = Round::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->orderBy('order_index')
            ->get();

        $previousComplete = true;

        foreach ($rounds as $round) {
            if ($round->stage === RoundStage::Group) {
                $groupHasFixtures = Fixture::query()->where('round_id', $round->id)->exists();
                $complete = ! $groupHasFixtures || $this->setup->groupStageComplete($tournament);
                $status = $complete ? Round::STATUS_COMPLETED : Round::STATUS_IN_PROGRESS;
            } else {
                $status = $previousComplete ? $this->roundStatus($round) : Round::STATUS_LOCKED;
            }

            if ($round->status !== $status) {
                $round->forceFill(['status' => $status])->save();
            }

            $previousComplete = $status === Round::STATUS_COMPLETED;
        }
    }

    /**
     * @return array<int, array{round_id: int, name: string, stage: string, status: string, fixtures: array<int, array<string, mixed>>}>
     */
    public function bracket(Tournament $tournament): array
    {
        if ($tournament->competition_id && $tournament->season_id) {
            $this->syncRoundStatuses($tournament);
        }

        $rounds = Round::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('stage', '!=', RoundStage::Group)
            ->orderBy('order_index')
            ->get();

        return $rounds->map(function (Round $round) {
            $fixtures = Fixture::query()
                ->with([
                    'homeTeam' => fn ($query) => $query->withTrashed(),
                    'awayTeam' => fn ($query) => $query->withTrashed(),
                    'byeTeam' => fn ($query) => $query->withTrashed(),
                    'match',
                ])
                ->where('round_id', $round->id)
                ->orderBy('id')
                ->get();

            return [
                'round_id' => $round->id,
                'name' => $round->name,
                'stage' => $round->stage->value,
                'status' => $round->status,
                'order_index' => $round->order_index,
                'fixtures' => $fixtures->map(fn (Fixture $fixture) => [
                    'id' => $fixture->id,
                    'match_id' => $fixture->match_id,
                    'home_team_id' => $fixture->home_team_id,
                    'away_team_id' => $fixture->away_team_id,
                    'bye_team_id' => $fixture->bye_team_id,
                    'source_home_fixture_id' => $fixture->source_home_fixture_id,
                    'source_away_fixture_id' => $fixture->source_away_fixture_id,
                    'home_team' => $fixture->homeTeam ? ['id' => $fixture->homeTeam->id, 'name' => $fixture->homeTeam->name, 'logo_url' => $fixture->homeTeam->logo_url] : null,
                    'away_team' => $fixture->awayTeam ? ['id' => $fixture->awayTeam->id, 'name' => $fixture->awayTeam->name, 'logo_url' => $fixture->awayTeam->logo_url] : null,
                    'bye_team' => $fixture->byeTeam ? ['id' => $fixture->byeTeam->id, 'name' => $fixture->byeTeam->name, 'logo_url' => $fixture->byeTeam->logo_url] : null,
                    'home_score' => $fixture->match?->home_score,
                    'away_score' => $fixture->match?->away_score,
                    'winner_team_id' => $fixture->match?->winner_team_id,
                    'status' => $fixture->match?->status?->value ?? $fixture->status->value,
                    'scheduled_at' => $fixture->scheduled_at?->toIso8601String(),
                ])->all(),
            ];
        })->all();
    }

    public function ensureMatch(Tournament $tournament, Fixture $fixture): ?FootballMatch
    {
        if ($fixture->match_id) {
            return $fixture->match;
        }

        if (! $fixture->home_team_id || ! $fixture->away_team_id) {
            return null;
        }

        $match = FootballMatch::create([
            'competition_id' => $tournament->competition_id,
            'season_id' => $tournament->season_id,
            'round_id' => $fixture->round_id,
            'group_id' => $fixture->group_id,
            'home_team_id' => $fixture->home_team_id,
            'away_team_id' => $fixture->away_team_id,
            'stadium_id' => $fixture->stadium_id,
            'status' => MatchStatus::Scheduled,
            'current_period' => 'upcoming',
            'created_by' => $tournament->organizer_id,
        ]);

        $fixture->forceFill(['match_id' => $match->id])->save();

        return $match;
    }

    public function knockoutTeamIds(Tournament $tournament): array
    {
        return TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->orderBy('group_id')
            ->orderBy('group_position')
            ->pluck('team_id')
            ->all();
    }

    public function resolvedKnockoutTeams(Tournament $tournament): int
    {
        return $this->setup->resolveKnockoutTeams($tournament);
    }

    /**
     * True when a non-group format is configured and registered for exactly 6
     * teams — the only situation the 6-team generators (byes / mini-groups)
     * target. group_knockout keeps its legacy halving behaviour.
     */
    public function isSixTeamBracket(Tournament $tournament): bool
    {
        if (in_array($tournament->tournament_format, ['groups_knockout', 'groups_only', 'league'], true)) {
            return false;
        }

        return $this->setup->resolveKnockoutTeams($tournament) === 6
            && count($this->knockoutTeamIds($tournament)) === 6;
    }

    /**
     * @return array<int, int>
     */
    private function halvingCounts(int $teamCount): array
    {
        $counts = [];

        while ($teamCount > 1) {
            $counts[] = intdiv($teamCount, 2);
            $teamCount = intdiv($teamCount, 2);
        }

        return $counts;
    }

    /**
     * Override the standard halving wiring for the 6-team byes bracket: the two
     * seeded byes (QF slots 3 & 4) become home feeds of the semis, and the two
     * quarter-final winners (QF slots 1 & 2) become away feeds.
     *
     * @param  array<int, array<int, int>>  $fixturesByRound
     */
    private function wireSixByesSources(array $fixturesByRound): void
    {
        $ids = array_values($fixturesByRound);

        if (count($ids) < 2) {
            return;
        }

        [$qf, $sf] = [$ids[0], $ids[1]];

        if (count($qf) < 4 || count($sf) < 2) {
            return;
        }

        Fixture::query()->whereKey($sf[0])->update([
            'source_home_fixture_id' => $qf[2],
            'source_away_fixture_id' => $qf[0],
        ]);

        Fixture::query()->whereKey($sf[1])->update([
            'source_home_fixture_id' => $qf[3],
            'source_away_fixture_id' => $qf[1],
        ]);
    }

    /**
     * Materialize the two Option B mini-groups and assign the six seeds.
     *
     * @param  array<int, int>  $seeds
     */
    private function seedGroups6(Tournament $tournament, array $seeds): void
    {
        $season = $tournament->season ?: Season::find($tournament->season_id);
        $groupRound = $this->setup->ensureGroupRound($tournament, $season);

        $names = ['A', 'B'];
        $groups = [];

        foreach ($names as $name) {
            $group = Group::query()->firstOrCreate(
                [
                    'competition_id' => $tournament->competition_id,
                    'season_id' => $tournament->season_id,
                    'round_id' => $groupRound->id,
                    'name' => $name,
                ],
                [
                    'competition_id' => $tournament->competition_id,
                    'season_id' => $tournament->season_id,
                    'round_id' => $groupRound->id,
                    'name' => $name,
                ]
            );

            $groups[] = $group;
        }

        foreach (array_slice(array_values($seeds), 0, 6) as $index => $teamId) {
            $groupIndex = $index < 3 ? 0 : 1;
            $position = ($index % 3) + 1;

            TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('team_id', $teamId)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->update([
                    'group_id' => $groups[$groupIndex]->id,
                    'group_position' => $position,
                ]);
        }

        $plan = $tournament->plan ?? [];
        $plan['knockout']['groups'] = [
            ['id' => $groups[0]->id, 'name' => 'A', 'team_ids' => array_slice($seeds, 0, 3)],
            ['id' => $groups[1]->id, 'name' => 'B', 'team_ids' => array_slice($seeds, 3, 3)],
        ];
        $tournament->forceFill(['plan' => $plan])->save();
    }

    private function roundStatus(Round $round): string
    {
        $fixtures = Fixture::query()
            ->where('round_id', $round->id)
            ->get(['id', 'status', 'match_id', 'bye_team_id']);

        if ($fixtures->isEmpty()) {
            return Round::STATUS_AVAILABLE;
        }

        $matchIds = $fixtures->pluck('match_id')->filter()->values();
        $matchStatuses = $matchIds->isNotEmpty()
            ? FootballMatch::query()->whereKey($matchIds->all())->pluck('status', 'id')
            : collect();

        $allFinished = true;
        $anyStarted = false;
        $anyFinished = false;

        foreach ($fixtures as $fixture) {
            if ($fixture->bye_team_id) {
                continue;
            }

            if (in_array($fixture->status?->value, [FixtureStatus::Cancelled->value, FixtureStatus::Postponed->value], true)) {
                continue;
            }

            $status = $matchStatuses->get($fixture->match_id);
            $status = $status instanceof MatchStatus ? $status->value : $status;

            if (in_array($status, [MatchStatus::Finished->value, MatchStatus::Cancelled->value, MatchStatus::Postponed->value], true)) {
                $anyFinished = true;

                continue;
            }

            if (in_array($status, MatchStatus::live(), true)) {
                $anyStarted = true;
                $allFinished = false;

                continue;
            }

            $allFinished = false;
        }

        if ($allFinished) {
            return Round::STATUS_COMPLETED;
        }

        if ($anyStarted || $anyFinished) {
            return Round::STATUS_IN_PROGRESS;
        }

        return Round::STATUS_AVAILABLE;
    }

    /**
     * Wire the explicit source relationships of every knockout fixture.
     * Fixture j of round r+1 feeds from fixtures 2j (home) and 2j+1 (away) of
     * round r — the standard halving bracket.
     *
     * @param  \Illuminate\Support\Collection<int, Round>  $rounds
     * @param  array<int, array<int, int>>  $fixturesByRound
     */
    private function wireBracketSources($rounds, array $fixturesByRound): void
    {
        $roundIds = $rounds->pluck('id')->values()->all();

        for ($i = 1; $i < count($roundIds); $i++) {
            $previous = $fixturesByRound[$roundIds[$i - 1]] ?? [];
            $current = $fixturesByRound[$roundIds[$i]] ?? [];

            foreach ($current as $index => $fixtureId) {
                Fixture::query()->whereKey($fixtureId)->update([
                    'source_home_fixture_id' => $previous[$index * 2] ?? null,
                    'source_away_fixture_id' => $previous[$index * 2 + 1] ?? null,
                ]);
            }
        }
    }
}
