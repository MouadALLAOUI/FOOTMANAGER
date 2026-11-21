<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Competition\Enums\CompetitionType;
use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Enums\RoundStage;
use App\Domains\Competition\Enums\SeasonStatus;
use App\Domains\Competition\Models\Competition;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Competition\Models\Group;
use App\Domains\Competition\Models\Round;
use App\Domains\Competition\Models\Season;
use App\Domains\Competition\Models\Standing;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TournamentSetupService
{
    public function __construct(
        private readonly TournamentTerrainBookingService $bookings,
    ) {}

    public function buildStructure(Tournament $tournament): Tournament
    {
        return DB::transaction(function () use ($tournament) {
            $competition = $this->ensureCompetition($tournament);
            $season = $this->ensureSeason($tournament);

            $groupRound = $this->ensureGroupRound($tournament, $season);
            if ($tournament->tournament_format !== 'league') {
                $hasAssignedTeams = TournamentTeam::query()
                    ->where('tournament_id', $tournament->id)
                    ->where('status', TournamentTeam::STATUS_REGISTERED)
                    ->whereNotNull('group_id')
                    ->exists();

                $groups = $this->ensureGroups($tournament, $season, $groupRound, ! $hasAssignedTeams && $tournament->group_mode !== 'free');
                $this->ensureKnockoutRoundsWhenReady($tournament, $season);
                $tournament->knockout_teams = $this->resolveKnockoutTeams($tournament);
            } else {
                $tournament->knockout_teams = 0;
                $tournament->groups_count = 0;
                $tournament->teams_per_group = null;
                $tournament->group_mode = null;
                $tournament->qualify_per_group = null;
            }

            $tournament->competition_id = $competition->id;
            $tournament->season_id = $season->id;
            $tournament->save();

            return $tournament->fresh();
        });
    }

    public function ensureCompetition(Tournament $tournament): Competition
    {
        if ($tournament->competition_id && $tournament->competition) {
            $competition = $tournament->competition;
            if ($tournament->tournament_format === 'league' && $competition->type !== CompetitionType::League) {
                $competition->forceFill(['type' => CompetitionType::League])->save();
            }

            return $competition;
        }

        $competition = Competition::create([
            'name' => $tournament->name,
            'slug' => $tournament->slug.'-cup',
            'type' => $tournament->tournament_format === 'league' ? CompetitionType::League : CompetitionType::Cup,
            'description' => $tournament->description,
            'active' => true,
            'settings' => [
                'tournament_id' => $tournament->id,
            ],
        ]);

        $tournament->forceFill(['competition_id' => $competition->id])->save();

        return $competition;
    }

    public function ensureSeason(Tournament $tournament): Season
    {
        if ($tournament->season_id && $tournament->season) {
            return $tournament->season;
        }

        $season = Season::create([
            'competition_id' => $this->ensureCompetition($tournament)->id,
            'name' => $this->seasonName($tournament),
            'starts_on' => $tournament->start_date,
            'ends_on' => $tournament->end_date,
            'status' => SeasonStatus::Active,
        ]);

        $tournament->forceFill(['season_id' => $season->id])->save();

        return $season;
    }

    public function ensureGroupRound(Tournament $tournament, Season $season): Round
    {
        $competitionId = $this->ensureCompetition($tournament)->id;
        $name = $tournament->tournament_format === 'league' ? 'الدوري' : 'دور المجموعات';

        return Round::query()->firstOrCreate(
            [
                'competition_id' => $competitionId,
                'season_id' => $season->id,
                'stage' => RoundStage::Group,
            ],
            [
                'name' => $name,
                'order_index' => 1,
            ],
        );
    }

    /**
     * Create (or top up) the full expected group set. Used by the draw service
     * when a free-mode tournament is auto-drawn and needs its groups materialized.
     *
     * @return Collection<int, Group>
     */
    public function ensureGroupSet(Tournament $tournament)
    {
        if ($tournament->tournament_format === 'league') {
            return collect();
        }

        $season = $this->ensureSeason($tournament);
        $groupRound = $this->ensureGroupRound($tournament, $season);

        return $this->ensureGroups($tournament, $season, $groupRound, true);
    }

    /**
     * Create (or top up) the tournament's group set. Free-mode tournaments do not
     * pre-create groups — they are created lazily while teams are assigned.
     *
     * @return Collection<int, Group>
     */
    public function ensureGroups(Tournament $tournament, Season $season, Round $groupRound, bool $createMissing = true)
    {
        if ($tournament->tournament_format === 'league') {
            return collect();
        }

        $competitionId = $this->ensureCompetition($tournament)->id;

        $existing = Group::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $season->id)
            ->orderBy('name')
            ->get();

        if (! $createMissing) {
            return $existing;
        }

        // If teams are already assigned to groups, do NOT create arbitrary empty groups
        $hasAssignedTeams = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->whereNotNull('group_id')
            ->exists();

        if ($hasAssignedTeams) {
            return $existing;
        }

        $groups = collect($existing);
        $usedNames = $existing->pluck('name')->flip();
        $index = $existing->count() + 1;

        while ($groups->count() < $tournament->groups_count) {
            do {
                $name = $this->groupLabel($index++);
            } while ($usedNames->has($name));

            $groups->push(Group::create([
                'competition_id' => $competitionId,
                'season_id' => $season->id,
                'round_id' => $groupRound->id,
                'name' => $name,
            ]));
        }

        return $groups;
    }

    /**
     * Knockout rounds are only created once the group stage is finished, unless
     * the format has no group stage (e.g. knockout_only).
     *
     * @return Round[]
     */
    public function ensureKnockoutRoundsWhenReady(Tournament $tournament, Season $season): array
    {
        if (in_array($tournament->tournament_format, ['groups_knockout', 'groups_double_round_robin_knockout'], true) && ! $this->groupStageComplete($tournament)) {
            return [];
        }

        return $this->ensureKnockoutRounds($tournament, $season);
    }

    /**
     * Active participating group IDs for the tournament:
     * strictly groups that contain at least one registered team.
     *
     * @return int[]
     */
    public function participatingGroupIds(Tournament $tournament): array
    {
        $teamGroupIds = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->whereNotNull('group_id')
            ->distinct()
            ->pluck('group_id')
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->values()
            ->all();

        if (empty($teamGroupIds)) {
            return [];
        }

        $existing = Group::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->whereIn('id', $teamGroupIds)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        return array_values($existing);
    }

    /**
     * Permanently deletes empty groups with 0 teams from the database
     * so they never appear or block tournament workflows.
     */
    public function cleanupEmptyGroups(Tournament $tournament): int
    {
        $competitionId = $tournament->competition_id;
        $seasonId = $tournament->season_id;
        if (! $competitionId || ! $seasonId) {
            return 0;
        }

        $participatingGroupIds = $this->participatingGroupIds($tournament);

        $emptyGroups = Group::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $seasonId)
            ->whereNotIn('id', $participatingGroupIds)
            ->get();

        $deleted = 0;
        foreach ($emptyGroups as $group) {
            // Delete any orphan fixtures belonging to this empty group
            Fixture::query()->where('group_id', $group->id)->delete();

            // Delete any standings belonging to this empty group
            Standing::query()->where('group_id', $group->id)->delete();

            // Clear any references in tournament teams
            TournamentTeam::query()->where('group_id', $group->id)->update(['group_id' => null]);

            // Permanently delete the empty group
            $group->delete();
            $deleted++;
        }

        // Synchronize tournament groups_count to match active participating groups if teams are assigned
        if (! empty($participatingGroupIds) && $tournament->groups_count !== count($participatingGroupIds)) {
            $tournament->groups_count = count($participatingGroupIds);
            $tournament->save();
        }

        return $deleted;
    }

    /**
     * @return array{complete: bool, groups: array<int, array<string, mixed>>, incomplete_groups: array<int, array<string, mixed>>, explanation: string|null}
     */
    public function groupStageDetails(Tournament $tournament): array
    {
        $competitionId = $tournament->competition_id;
        $seasonId = $tournament->season_id;

        if (! $competitionId || ! $seasonId) {
            return [
                'complete' => false,
                'groups' => [],
                'incomplete_groups' => [],
                'explanation' => 'لم يتم إعداد مسابقة وموسم البطولة بعد',
            ];
        }

        // Clean up any empty groups with 0 teams permanently from DB
        $this->cleanupEmptyGroups($tournament);

        // Active participating groups: ONLY groups with genuinely registered teams in this tournament
        $participatingGroupIds = $this->participatingGroupIds($tournament);

        if (empty($participatingGroupIds)) {
            return [
                'complete' => false,
                'groups' => [],
                'incomplete_groups' => [],
                'explanation' => 'لم يتم توزيع الفرق المشاركة على المجموعات بعد',
            ];
        }

        // Query strictly the groups that contain active participating teams
        $groups = Group::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $seasonId)
            ->whereIn('id', $participatingGroupIds)
            ->orderBy('id')
            ->get();

        if ($groups->isEmpty()) {
            return [
                'complete' => false,
                'groups' => [],
                'incomplete_groups' => [],
                'explanation' => 'لا توجد مجموعات مشاركة مسجلة في البطولة',
            ];
        }

        // Only query fixtures belonging to active participating groups
        $fixtures = Fixture::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $seasonId)
            ->whereIn('group_id', $participatingGroupIds)
            ->get(['id', 'match_id', 'status', 'group_id']);

        $planGroupNames = ($tournament->plan ?? [])['group_names'] ?? [];

        if ($fixtures->isEmpty()) {
            $unready = $groups->map(fn ($g) => [
                'group_id' => $g->id,
                'group_name' => $planGroupNames[$g->id] ?? $g->name,
                'total_matches' => 0,
                'finished_matches' => 0,
                'remaining_matches' => 0,
                'is_complete' => false,
            ])->all();

            return [
                'complete' => false,
                'groups' => $unready,
                'incomplete_groups' => $unready,
                'explanation' => 'لم يتم جدولة مباريات دور المجموعات بعد',
            ];
        }

        $matchIds = $fixtures->pluck('match_id')->filter()->values();
        $matchStatuses = $matchIds->isNotEmpty()
            ? FootballMatch::query()->whereKey($matchIds->all())->pluck('status', 'id')
            : collect();

        $byGroup = [];
        $incomplete = [];

        foreach ($groups as $group) {
            $groupFixtures = $fixtures->where('group_id', $group->id);
            $total = $groupFixtures->count();

            // Strictly ignore any group that has 0 total matches — it's not an active match group
            if ($total === 0) {
                continue;
            }

            $finished = 0;
            $remaining = 0;

            foreach ($groupFixtures as $fixture) {
                if (in_array($fixture->status?->value, [FixtureStatus::Cancelled->value, FixtureStatus::Postponed->value], true)) {
                    $finished++;
                    continue;
                }

                $status = $matchStatuses->get($fixture->match_id);
                $status = $status instanceof MatchStatus ? $status->value : $status;

                if (in_array($status, [MatchStatus::Finished->value, MatchStatus::Cancelled->value, MatchStatus::Postponed->value], true)) {
                    $finished++;
                } else {
                    $remaining++;
                }
            }

            $isComplete = ($remaining === 0);
            $resolvedName = $planGroupNames[$group->id] ?? $group->name;

            $info = [
                'group_id' => $group->id,
                'group_name' => $resolvedName,
                'total_matches' => $total,
                'finished_matches' => $finished,
                'remaining_matches' => $remaining,
                'is_complete' => $isComplete,
            ];

            $byGroup[] = $info;
            if (! $isComplete && $remaining > 0) {
                $incomplete[] = $info;
            }
        }

        $isAllComplete = ! empty($byGroup) && empty($incomplete);
        $explanation = null;
        if (! $isAllComplete && ! empty($incomplete)) {
            $names = array_map(function ($g) {
                return "{$g['group_name']} (متبقي {$g['remaining_matches']} مباريات)";
            }, $incomplete);
            $explanation = 'دور المجموعات لم يكتمل بعد: ' . implode('، ', $names);
        }

        return [
            'complete' => $isAllComplete,
            'groups' => $byGroup,
            'incomplete_groups' => $incomplete,
            'explanation' => $explanation,
        ];
    }

    public function groupStageComplete(Tournament $tournament): bool
    {
        return $this->groupStageDetails($tournament)['complete'];
    }

    /**
     * @return Round[]
     */
    public function ensureKnockoutRounds(Tournament $tournament, Season $season, ?string $sixMode = null): array
    {
        if ($tournament->tournament_format === 'groups_only' || $tournament->tournament_format === 'league') {
            return [];
        }

        $competitionId = $this->ensureCompetition($tournament)->id;

        $knockoutTeams = $this->resolveKnockoutTeams($tournament);
        $tiers = $this->knockoutTiersFor($knockoutTeams, $sixMode);

        $existing = Round::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $season->id)
            ->where('stage', '!=', RoundStage::Group)
            ->orderBy('order_index')
            ->get();

        if ($existing->count() === count($tiers)
            && $existing->map(fn (Round $round) => $round->stage)->values()->all() === $tiers) {
            return $existing->all();
        }

        if ($existing->isNotEmpty()) {
            $roundIds = $existing->pluck('id');

            $hasPlayed = Fixture::query()
                ->whereIn('round_id', $roundIds)
                ->whereHas('match', function ($query) {
                    $query->whereIn('status', [
                        MatchStatus::Finished->value,
                        MatchStatus::Cancelled->value,
                        MatchStatus::Postponed->value,
                        ...MatchStatus::live(),
                    ]);
                })
                ->exists();

            if ($hasPlayed) {
                throw new DomainException('لا يمكن إعادة بناء الأدوار الإقصائية بعد بدء مبارياتها');
            }

            $matchIds = Fixture::query()
                ->whereIn('round_id', $roundIds)
                ->pluck('match_id')
                ->filter()
                ->values();

            if ($matchIds->isNotEmpty()) {
                FootballMatch::whereKey($matchIds->all())->delete();
            }

            $this->bookings->archiveForFixtures(
                Fixture::query()->whereIn('round_id', $roundIds)->pluck('id')
            );

            Fixture::whereIn('round_id', $roundIds)->delete();
            Round::whereKey($roundIds)->delete();
        }

        $rounds = [];
        $orderIndex = 2;

        foreach ($tiers as $index => $stage) {
            $rounds[] = Round::create([
                'competition_id' => $competitionId,
                'season_id' => $season->id,
                'name' => $this->stageLabel($stage),
                'stage' => $stage,
                'order_index' => $orderIndex++,
                'status' => $index === 0 ? Round::STATUS_AVAILABLE : Round::STATUS_LOCKED,
            ]);
        }

        return $rounds;
    }

    public function resolveKnockoutTeams(Tournament $tournament): int
    {
        if (in_array($tournament->tournament_format, ['groups_knockout', 'groups_double_round_robin_knockout'], true)) {
            $perGroup = max(1, (int) ($tournament->qualify_per_group ?: 2));
            $participatingCount = count($this->participatingGroupIds($tournament));

            $groupsCount = $participatingCount > 0 ? $participatingCount : max(1, (int) $tournament->groups_count);

            return max(2, $groupsCount * $perGroup);
        }

        if ($tournament->knockout_teams) {
            return max(2, (int) $tournament->knockout_teams);
        }

        return max(2, $this->floorPowerOfTwo((int) $tournament->teams_count));
    }

    /**
     * @return RoundStage[]
     */
    public function knockoutTiers(int $teamCount): array
    {
        $tiers = [];

        if ($teamCount >= 16) {
            $tiers[] = RoundStage::RoundOf16;
        }

        if ($teamCount >= 8) {
            $tiers[] = RoundStage::Quarterfinal;
        }

        if ($teamCount >= 4) {
            $tiers[] = RoundStage::Semifinal;
        }

        $tiers[] = RoundStage::Final;

        return $tiers;
    }

    /**
     * Tiers for a 6-team knockout. `byes` enters two top seeds directly in the
     * semi-finals (QF + SF + Final); `groups6` goes straight to SF + Final with
     * the four qualifiers coming from two mini-groups.
     *
     * Tiers for an unbalanced (non power-of-2) knockout. `playin` runs a
     * preliminary round that reduces the field to the nearest power of 2.
     * `bye_final` keeps the raw halving trail but caps every unbalanced round
     * with a seeded bye (advanced by standings) so the odd extra survivor is
     * never orphaned.
     *
     * @return RoundStage[]
     */
    public function knockoutTiersFor(int $teamCount, ?string $sixMode = null): array
    {
        if ($sixMode === 'byes') {
            return [RoundStage::Quarterfinal, RoundStage::Semifinal, RoundStage::Final];
        }

        if ($sixMode === 'groups6') {
            return [RoundStage::Semifinal, RoundStage::Final];
        }

        if ($sixMode === 'playin') {
            return array_merge(
                [RoundStage::PlayIn],
                $this->knockoutTiers($this->playInSizes($teamCount)['target']),
            );
        }

        if ($sixMode === 'bye_final') {
            return array_map(
                fn (int $width) => $this->stageForWidth($width),
                $this->ceilHalvingWidths($teamCount),
            );
        }

        return $this->knockoutTiers($teamCount);
    }

    public function stageLabel(RoundStage $stage): string
    {
        return match ($stage) {
            RoundStage::Group => 'دور المجموعات',
            RoundStage::PlayIn => 'دور تمهيدي',
            RoundStage::RoundOf16 => 'دور الـ16',
            RoundStage::Quarterfinal => 'ربع النهائي',
            RoundStage::Semifinal => 'نصف النهائي',
            RoundStage::Final => 'النهائي',
        };
    }

    /**
     * Preliminary play-in sizes: the nearest power of 2 (target) plus how many
     * real play-in matches and how many seeded byes the preliminary round holds.
     *
     * @return array{target: int, matches: int, byes: int}
     */
    public function playInSizes(int $teamCount): array
    {
        $target = $this->floorPowerOfTwo($teamCount);
        $matches = $teamCount - $target;

        return [
            'target' => $target,
            'matches' => $matches,
            'byes' => $target - $matches,
        ];
    }

    /**
     * Fixture widths per round for a balanced-byes bracket (`bye_final`): every
     * round holds ceil(incoming / 2) fixtures; an odd incoming count means one
     * of them is a seeded bye. Always ends with the 1-fixture final.
     *
     * @return array<int, int>
     */
    public function ceilHalvingWidths(int $teamCount): array
    {
        $widths = [];

        while ($teamCount > 1) {
            $teamCount = intdiv($teamCount + 1, 2);
            $widths[] = $teamCount;
        }

        return $widths;
    }

    /**
     * Human-friendly stage for a round with the given fixture count.
     *
     * @return RoundStage
     */
    private function stageForWidth(int $width): RoundStage
    {
        return match (true) {
            $width <= 1 => RoundStage::Final,
            $width === 2 => RoundStage::Semifinal,
            $width <= 4 => RoundStage::Quarterfinal,
            default => RoundStage::RoundOf16,
        };
    }

    public function teardown(Tournament $tournament): void
    {
        DB::transaction(function () use ($tournament) {
            if ($tournament->competition_id && $tournament->season_id) {
                $matchIds = Fixture::query()
                    ->where('competition_id', $tournament->competition_id)
                    ->where('season_id', $tournament->season_id)
                    ->pluck('match_id')
                    ->filter()
                    ->values();

                if ($matchIds->isNotEmpty()) {
                    FootballMatch::whereKey($matchIds->all())->delete();
                }

                $this->bookings->deleteForTournament($tournament);

                Fixture::query()
                    ->where('competition_id', $tournament->competition_id)
                    ->where('season_id', $tournament->season_id)
                    ->delete();

                Competition::whereKey($tournament->competition_id)->delete();
            }

            $tournament->forceFill(['competition_id' => null, 'season_id' => null])->save();

            Team::query()
                ->whereIn('id', TournamentTeam::query()
                    ->where('tournament_id', $tournament->id)
                    ->pluck('team_id'))
                ->where('is_free', true)
                ->delete();

            $tournament->delete();
        });
    }

    /**
     * @return array<int, array{key: string, label: string, done: bool, meta?: mixed}>
     */
    public function progress(Tournament $tournament): array
    {
        $teamsAdded = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->count();

        $teamsDrawn = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->whereNotNull('group_id')
            ->count();

        $fixturesCount = $tournament->competition_id
            ? Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->count()
            : 0;

        $hasKnockout = ! in_array($tournament->tournament_format, ['groups_only', 'league'], true);

        $knockoutReady = false;
        if ($hasKnockout && $tournament->competition_id) {
            $knockoutRounds = Round::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->where('stage', '!=', RoundStage::Group)
                ->count();
            $knockoutReady = $knockoutRounds > 0;
        }

        return [
            [
                'key' => 'competition_created',
                'done' => $tournament->competition_id !== null,
                'action' => 'settings',
            ],
            [
                'key' => 'season_created',
                'done' => $tournament->season_id !== null,
                'action' => 'settings',
            ],
            [
                'key' => 'groups_created',
                'done' => $tournament->groups_count > 0,
                'action' => 'settings',
            ],
            [
                'key' => 'teams_added',
                'done' => $teamsAdded > 0,
                'action' => 'teams',
                'meta' => ['registered' => $teamsAdded, 'expected' => $tournament->teams_count],
            ],
            [
                'key' => 'draw_completed',
                'done' => $teamsAdded > 0 && $teamsDrawn === $teamsAdded,
                'action' => 'draw',
            ],
            [
                'key' => 'fixtures_generated',
                'done' => $fixturesCount > 0,
                'action' => 'fixtures',
                'meta' => ['fixtures' => $fixturesCount],
            ],
            [
                'key' => 'knockout_ready',
                'done' => $knockoutReady,
                'action' => 'bracket',
            ],
        ];
    }

    private function seasonName(Tournament $tournament): string
    {
        if ($tournament->edition) {
            return 'النسخة '.$tournament->edition;
        }

        return 'الموسم '.$tournament->start_date?->format('Y');
    }

    public function groupLabel(int $index): string
    {
        if ($index <= 26) {
            return chr(64 + $index);
        }

        return 'G'.$index;
    }

    private function floorPowerOfTwo(int $n): int
    {
        $power = 1;
        while ($power * 2 <= $n) {
            $power *= 2;
        }

        return $power;
    }
}
