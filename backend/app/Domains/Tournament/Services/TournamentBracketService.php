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
     * @return array<int, array{round_id: int, name: string, stage: string, fixtures: array<int, array<string, mixed>>}>
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

                $teamCount = intdiv($teamCount, 2);
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
            $tournament->forceFill(['plan' => $plan])->save();

            return $this->bracket($tournament);
        });
    }

    /**
     * @param  array<int, int>  $qualified  team ids ordered by rank (1st, 2nd, ...)
     * @return array<int, array{round_id: int, name: string, stage: string, fixtures: array<int, array<string, mixed>>}>
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

    public function advance(Fixture $fixture, Tournament $tournament): void
    {
        if (! $fixture->round_id) {
            return;
        }

        $nextRound = Round::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('order_index', $fixture->round->order_index + 1)
            ->first();

        if (! $nextRound) {
            return;
        }

        $winner = $fixture->match?->winner_team_id;

        if (! $winner) {
            throw new DomainException('لا يمكن تأهيل فريق بدون تحديد الفائز');
        }

        $roundFixtures = Fixture::query()
            ->where('round_id', $fixture->round_id)
            ->orderBy('id')
            ->get();

        $currentIndex = $roundFixtures->search(fn (Fixture $f) => $f->id === $fixture->id);
        $nextIndex = intdiv($currentIndex, 2);

        $nextFixture = Fixture::query()
            ->where('round_id', $nextRound->id)
            ->orderBy('id')
            ->get()
            ->get($nextIndex);

        if (! $nextFixture) {
            return;
        }

        if ($currentIndex % 2 === 0) {
            $nextFixture->home_team_id = $winner;
        } else {
            $nextFixture->away_team_id = $winner;
        }

        $nextFixture->save();

        $this->ensureMatch($tournament, $nextFixture);
    }

    /**
     * @return array<int, array{round_id: int, name: string, stage: string, fixtures: array<int, array<string, mixed>>}>
     */
    public function bracket(Tournament $tournament): array
    {
        $rounds = Round::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('stage', '!=', RoundStage::Group)
            ->orderBy('order_index')
            ->get();

        return $rounds->map(function (Round $round) {
            $fixtures = Fixture::query()
                ->with(['homeTeam:id,name,logo_path', 'awayTeam:id,name,logo_path', 'match'])
                ->where('round_id', $round->id)
                ->orderBy('id')
                ->get();

            return [
                'round_id' => $round->id,
                'name' => $round->name,
                'stage' => $round->stage->value,
                'order_index' => $round->order_index,
                'fixtures' => $fixtures->map(fn (Fixture $fixture) => [
                    'id' => $fixture->id,
                    'match_id' => $fixture->match_id,
                    'home_team_id' => $fixture->home_team_id,
                    'away_team_id' => $fixture->away_team_id,
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
}
