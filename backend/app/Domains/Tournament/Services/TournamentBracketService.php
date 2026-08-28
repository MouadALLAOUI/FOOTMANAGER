<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Enums\RoundStage;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Competition\Models\Round;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use Illuminate\Support\Facades\DB;

class TournamentBracketService
{
    public function __construct(
        private readonly TournamentSetupService $setup,
    ) {}

    /**
     * @return array<int, array{round_id: int, name: string, stage: string, status: string, fixtures: array<int, array<string, mixed>>}>
     */
    public function generateBracket(Tournament $tournament): array
    {
        return DB::transaction(function () use ($tournament) {
            $this->setup->buildStructure($tournament);

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

            $teamCount = $this->setup->resolveKnockoutTeams($tournament);
            $fixturesByRound = [];

            foreach ($rounds as $round) {
                $expected = intdiv($teamCount, 2);
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

                $teamCount = intdiv($teamCount, 2);
            }

            $this->wireBracketSources($rounds, $fixturesByRound);

            $plan = $tournament->plan ?? [];
            $plan['bracket'] = [
                'rounds' => $rounds->map(fn (Round $round) => [
                    'round_id' => $round->id,
                    'stage' => $round->stage->value,
                    'name' => $round->name,
                    'order_index' => $round->order_index,
                ])->all(),
            ];
            $tournament->forceFill(['plan' => $plan])->save();

            return $this->bracket($tournament);
        });
    }

    /**
     * @param  array<int, int>  $qualified  team ids ordered by rank (1st, 2nd, ...)
     * @return array<int, array{round_id: int, name: string, stage: string, status: string, fixtures: array<int, array<string, mixed>>}>
     */
    public function populateKnockout(Tournament $tournament, array $qualified): array
    {
        return DB::transaction(function () use ($tournament, $qualified) {
            $this->generateBracket($tournament);

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

                $homeWinner = $homeSource?->match?->winner_team_id;
                $awayWinner = $awaySource?->match?->winner_team_id;

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
                    'source_home_fixture_id' => $fixture->source_home_fixture_id,
                    'source_away_fixture_id' => $fixture->source_away_fixture_id,
                    'home_team' => $fixture->homeTeam ? ['id' => $fixture->homeTeam->id, 'name' => $fixture->homeTeam->name, 'logo_url' => $fixture->homeTeam->logo_url] : null,
                    'away_team' => $fixture->awayTeam ? ['id' => $fixture->awayTeam->id, 'name' => $fixture->awayTeam->name, 'logo_url' => $fixture->awayTeam->logo_url] : null,
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

    private function roundStatus(Round $round): string
    {
        $fixtures = Fixture::query()
            ->where('round_id', $round->id)
            ->get(['id', 'status', 'match_id']);

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
