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
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TournamentSetupService
{
    /**
     * Derive a balanced (groups_count, teams_per_group) split from the number of
     * teams, preferring roughly 4 teams per group with at least 2 groups.
     *
     * @return array{0: int, 1: int}
     */
    public static function deriveGroups(int $teams): array
    {
        $groups = min(max((int) round($teams / 4), 2), 8);
        $perGroup = (int) ceil($teams / $groups);

        return [$groups, $perGroup];
    }

    public function buildStructure(Tournament $tournament): Tournament
    {
        return DB::transaction(function () use ($tournament) {
            $competition = $this->ensureCompetition($tournament);
            $season = $this->ensureSeason($tournament);

            $groupRound = $this->ensureGroupRound($tournament, $season);
            $groups = $this->ensureGroups($tournament, $season, $groupRound);
            $this->ensureKnockoutRoundsWhenReady($tournament, $season);

            $tournament->competition_id = $competition->id;
            $tournament->season_id = $season->id;
            $tournament->knockout_teams = $this->resolveKnockoutTeams($tournament);
            $tournament->save();

            return $tournament->fresh();
        });
    }

    public function ensureCompetition(Tournament $tournament): Competition
    {
        if ($tournament->competition_id && $tournament->competition) {
            return $tournament->competition;
        }

        $competition = Competition::create([
            'name' => $tournament->name,
            'slug' => $tournament->slug.'-cup',
            'type' => CompetitionType::Cup,
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

        return Round::query()->firstOrCreate(
            [
                'competition_id' => $competitionId,
                'season_id' => $season->id,
                'stage' => RoundStage::Group,
            ],
            [
                'name' => 'دور المجموعات',
                'order_index' => 1,
            ],
        );
    }

    /**
     * @return Collection<int, Group>
     */
    public function ensureGroups(Tournament $tournament, Season $season, Round $groupRound)
    {
        $competitionId = $this->ensureCompetition($tournament)->id;

        $existing = Group::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $season->id)
            ->orderBy('name')
            ->get();

        if ($existing->isNotEmpty()) {
            return $existing;
        }

        $groups = [];
        for ($i = 1; $i <= $tournament->groups_count; $i++) {
            $groups[] = Group::create([
                'competition_id' => $competitionId,
                'season_id' => $season->id,
                'round_id' => $groupRound->id,
                'name' => $this->groupLabel($i),
            ]);
        }

        return collect($groups);
    }

    /**
     * Knockout rounds are only created once the group stage is finished, unless
     * the format has no group stage (e.g. knockout_only).
     *
     * @return Round[]
     */
    public function ensureKnockoutRoundsWhenReady(Tournament $tournament, Season $season): array
    {
        if ($tournament->tournament_format === 'groups_knockout' && ! $this->groupStageComplete($tournament)) {
            return [];
        }

        return $this->ensureKnockoutRounds($tournament, $season);
    }

    public function groupStageComplete(Tournament $tournament): bool
    {
        $competitionId = $tournament->competition_id;
        $seasonId = $tournament->season_id;

        if (! $competitionId || ! $seasonId) {
            return false;
        }

        $fixtures = Fixture::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $seasonId)
            ->whereNotNull('group_id')
            ->get(['id', 'match_id', 'status']);

        if ($fixtures->isEmpty()) {
            return false;
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

    /**
     * @return Round[]
     */
    public function ensureKnockoutRounds(Tournament $tournament, Season $season): array
    {
        if ($tournament->tournament_format === 'groups_only' || $tournament->tournament_format === 'league') {
            return [];
        }

        $competitionId = $this->ensureCompetition($tournament)->id;

        $knockoutTeams = $this->resolveKnockoutTeams($tournament);
        $tiers = $this->knockoutTiers($knockoutTeams);

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

            $matchIds = Fixture::query()
                ->whereIn('round_id', $roundIds)
                ->pluck('match_id')
                ->filter()
                ->values();

            if ($matchIds->isNotEmpty()) {
                FootballMatch::whereKey($matchIds->all())->delete();
            }

            Fixture::whereIn('round_id', $roundIds)->delete();
            Round::whereKey($roundIds)->delete();
        }

        $rounds = [];
        $orderIndex = 2;

        foreach ($tiers as $stage) {
            $rounds[] = Round::create([
                'competition_id' => $competitionId,
                'season_id' => $season->id,
                'name' => $this->stageLabel($stage),
                'stage' => $stage,
                'order_index' => $orderIndex++,
            ]);
        }

        return $rounds;
    }

    public function resolveKnockoutTeams(Tournament $tournament): int
    {
        if ($tournament->tournament_format === 'groups_knockout') {
            $perGroup = max(1, (int) ($tournament->qualify_per_group ?: 2));

            return max(2, (int) $tournament->groups_count * $perGroup);
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

    public function stageLabel(RoundStage $stage): string
    {
        return match ($stage) {
            RoundStage::Group => 'دور المجموعات',
            RoundStage::RoundOf16 => 'دور الـ16',
            RoundStage::Quarterfinal => 'ربع النهائي',
            RoundStage::Semifinal => 'نصف النهائي',
            RoundStage::Final => 'النهائي',
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
            ],
            [
                'key' => 'season_created',
                'done' => $tournament->season_id !== null,
            ],
            [
                'key' => 'groups_created',
                'done' => $tournament->groups_count > 0,
            ],
            [
                'key' => 'teams_added',
                'done' => $teamsAdded > 0,
                'meta' => ['registered' => $teamsAdded, 'expected' => $tournament->teams_count],
            ],
            [
                'key' => 'draw_completed',
                'done' => $teamsAdded > 0 && $teamsDrawn === $teamsAdded,
            ],
            [
                'key' => 'fixtures_generated',
                'done' => $fixturesCount > 0,
                'meta' => ['fixtures' => $fixturesCount],
            ],
            [
                'key' => 'knockout_ready',
                'done' => $knockoutReady,
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

    private function groupLabel(int $index): string
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
