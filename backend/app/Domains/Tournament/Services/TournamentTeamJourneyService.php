<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Competition\Enums\RoundStage;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Competition\Models\Round;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;

class TournamentTeamJourneyService
{
    public function __construct(
        private readonly TournamentStandingsService $standings,
    ) {}

    public function journey(Team $team, ?Tournament $tournament = null): array
    {
        $participatingTournamentIds = TournamentTeam::query()
            ->where('team_id', $team->id)
            ->pluck('tournament_id');

        $tournamentsList = Tournament::query()
            ->whereIn('id', $participatingTournamentIds)
            ->orderByDesc('start_date')
            ->get(['id', 'name', 'slug', 'status', 'start_date', 'tournament_format', 'logo_path', 'cover_path'])
            ->map(fn (Tournament $t) => [
                'id' => $t->id,
                'name' => $t->name,
                'slug' => $t->slug,
                'status' => $t->status,
                'format' => $t->tournament_format,
                'logo_url' => $t->logo_url,
                'cover_url' => $t->cover_url,
            ])
            ->values()
            ->all();

        if (empty($tournamentsList)) {
            return [
                'team' => [
                    'id' => $team->id,
                    'name' => $team->name,
                    'logo_url' => $team->logo_url,
                ],
                'has_tournaments' => false,
                'tournaments' => [],
                'selected_tournament' => null,
                'group_stage' => null,
                'knockout_stages' => [],
                'summary' => null,
            ];
        }

        if (! $tournament) {
            $tournament = Tournament::query()
                ->whereIn('id', $participatingTournamentIds)
                ->orderByRaw("CASE WHEN status = 'in_progress' THEN 1 WHEN status = 'published' THEN 2 ELSE 3 END")
                ->orderByDesc('start_date')
                ->first();
        }

        $groupSummary = $this->resolveGroupStage($tournament, $team);
        $knockoutStages = $this->resolveKnockoutStages($tournament, $team);

        $summary = $this->buildSummary($tournament, $team, $groupSummary, $knockoutStages);

        return [
            'team' => [
                'id' => $team->id,
                'name' => $team->name,
                'logo_url' => $team->logo_url,
            ],
            'has_tournaments' => true,
            'tournaments' => $tournamentsList,
            'selected_tournament' => [
                'id' => $tournament->id,
                'name' => $tournament->name,
                'slug' => $tournament->slug,
                'status' => $tournament->status,
                'format' => $tournament->tournament_format,
                'logo_url' => $tournament->logo_url,
                'cover_url' => $tournament->cover_url,
            ],
            'group_stage' => $groupSummary,
            'knockout_stages' => $knockoutStages,
            'summary' => $summary,
        ];
    }

    private function resolveGroupStage(Tournament $tournament, Team $team): ?array
    {
        $hasGroups = in_array($tournament->tournament_format, [
            'groups_knockout',
            'groups_only',
            'groups_double_round_robin_knockout',
        ], true);

        if (! $hasGroups) {
            return null;
        }

        try {
            $standings = $this->standings->standings($tournament);
        } catch (\Throwable) {
            return null;
        }

        $groupRound = Round::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('stage', RoundStage::Group)
            ->first();

        $groupMatches = [];
        if ($groupRound) {
            $fixtures = Fixture::query()
                ->with(['homeTeam', 'awayTeam', 'match'])
                ->where('round_id', $groupRound->id)
                ->where(function ($q) use ($team) {
                    $q->where('home_team_id', $team->id)
                        ->orWhere('away_team_id', $team->id);
                })
                ->orderBy('scheduled_at')
                ->orderBy('id')
                ->get();

            foreach ($fixtures as $f) {
                $isHome = (int) $f->home_team_id === (int) $team->id;
                $opp = $isHome ? $f->awayTeam : $f->homeTeam;
                $groupMatches[] = [
                    'fixture_id' => $f->id,
                    'match_id' => $f->match_id,
                    'scheduled_at' => $f->scheduled_at?->toIso8601String(),
                    'status' => $f->match?->status?->value ?? ($f->status?->value ?? 'scheduled'),
                    'is_home' => $isHome,
                    'opponent' => $opp ? [
                        'id' => $opp->id,
                        'name' => $opp->name,
                        'logo_url' => $opp->logo_url,
                    ] : null,
                    'team_score' => $isHome ? $f->home_score : $f->away_score,
                    'opponent_score' => $isHome ? $f->away_score : $f->home_score,
                ];
            }
        }

        foreach ($standings['groups'] ?? [] as $group) {
            foreach ($group['rows'] ?? [] as $rank => $row) {
                if ((int) ($row['team_id'] ?? 0) === (int) $team->id) {
                    $qualifyCount = max(1, (int) ($tournament->qualify_per_group ?: 2));
                    $isQualified = ($rank + 1) <= $qualifyCount;

                    $wins = (int) ($row['wins'] ?? ($row['won'] ?? 0));
                    $draws = (int) ($row['draws'] ?? ($row['drawn'] ?? 0));
                    $losses = (int) ($row['losses'] ?? ($row['lost'] ?? 0));
                    $played = (int) ($row['played'] ?? ($wins + $draws + $losses));

                    return [
                        'group_id' => $group['id'] ?? null,
                        'group_name' => $group['name'] ?? 'المجموعة',
                        'rank' => $rank + 1,
                        'played' => $played,
                        'won' => $wins,
                        'wins' => $wins,
                        'drawn' => $draws,
                        'draws' => $draws,
                        'lost' => $losses,
                        'losses' => $losses,
                        'goals_for' => (int) ($row['goals_for'] ?? 0),
                        'goals_against' => (int) ($row['goals_against'] ?? 0),
                        'goal_difference' => (int) ($row['goal_difference'] ?? 0),
                        'points' => (int) ($row['points'] ?? 0),
                        'qualified' => $isQualified,
                        'matches' => $groupMatches,
                    ];
                }
            }
        }

        return null;
    }

    private function resolveKnockoutStages(Tournament $tournament, Team $team): array
    {
        if (in_array($tournament->tournament_format, ['groups_only', 'league'], true)) {
            return [];
        }

        $rounds = Round::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('stage', '!=', RoundStage::Group)
            ->orderBy('order_index')
            ->get();

        if ($rounds->isEmpty()) {
            return [];
        }

        $stages = [];
        $isEliminated = false;

        foreach ($rounds as $round) {
            $fixtures = Fixture::query()
                ->with(['homeTeam', 'awayTeam', 'match'])
                ->where('round_id', $round->id)
                ->where(function ($q) use ($team) {
                    $q->where('home_team_id', $team->id)
                        ->orWhere('away_team_id', $team->id);
                })
                ->orderBy('id')
                ->get();

            if ($fixtures->isEmpty()) {
                if (! $isEliminated && ! empty($stages)) {
                    $lastStage = end($stages);
                    if ($lastStage && $lastStage['status'] === 'completed' && ($lastStage['won'] ?? false)) {
                        $stages[] = [
                            'round_id' => $round->id,
                            'round_name' => $round->name,
                            'stage' => $round->stage->value,
                            'status' => 'upcoming',
                            'opponent' => null,
                            'matches' => [],
                            'won' => null,
                            'is_eliminated' => false,
                        ];
                    }
                }
                continue;
            }

            $matches = [];
            $won = null;
            $stageEliminated = false;
            $opponent = null;
            $allFinished = true;

            $teamTotalScore = 0;
            $oppTotalScore = 0;
            $hasMultipleLegs = $fixtures->count() > 1;

            foreach ($fixtures as $idx => $fixture) {
                $isHome = (int) $fixture->home_team_id === (int) $team->id;
                $oppModel = $isHome ? $fixture->awayTeam : $fixture->homeTeam;
                if ($oppModel && ! $opponent) {
                    $opponent = [
                        'id' => $oppModel->id,
                        'name' => $oppModel->name,
                        'logo_url' => $oppModel->logo_url,
                    ];
                }

                $match = $fixture->match;
                $matchStatus = $match?->status?->value ?? $fixture->status;
                $isFinished = $matchStatus === MatchStatus::Finished->value;
                if (! $isFinished) {
                    $allFinished = false;
                }

                $teamScore = $match ? ($isHome ? (int) $match->home_score : (int) $match->away_score) : null;
                $oppScore = $match ? ($isHome ? (int) $match->away_score : (int) $match->home_score) : null;
                $teamPenalties = $match ? ($isHome ? $match->home_penalties : $match->away_penalties) : null;
                $oppPenalties = $match ? ($isHome ? $match->away_penalties : $match->home_penalties) : null;

                if ($teamScore !== null) {
                    $teamTotalScore += $teamScore;
                    $oppTotalScore += $oppScore;
                }

                $matches[] = [
                    'fixture_id' => $fixture->id,
                    'match_id' => $match?->id,
                    'leg' => $fixture->last_change_payload['leg'] ?? ($hasMultipleLegs ? ($idx + 1) : 1),
                    'is_home' => $isHome,
                    'status' => $matchStatus,
                    'team_score' => $teamScore,
                    'opponent_score' => $oppScore,
                    'team_penalties' => $teamPenalties,
                    'opponent_penalties' => $oppPenalties,
                    'scheduled_at' => $fixture->scheduled_at?->toISOString(),
                    'winner_team_id' => $match?->winner_team_id,
                ];
            }

            if ($allFinished && ! empty($matches)) {
                $decidingFixture = $fixtures->last();
                $decidingMatch = $decidingFixture?->match;
                $winnerId = (int) ($decidingMatch?->winner_team_id ?? 0);

                if ($winnerId === (int) $team->id) {
                    $won = true;
                    $status = 'completed';
                } elseif ($winnerId > 0) {
                    $won = false;
                    $status = 'eliminated';
                    $stageEliminated = true;
                    $isEliminated = true;
                } else {
                    $won = $teamTotalScore > $oppTotalScore;
                    $status = $won ? 'completed' : 'eliminated';
                    if (! $won) {
                        $stageEliminated = true;
                        $isEliminated = true;
                    }
                }
            } else {
                $status = 'current';
            }

            $stages[] = [
                'round_id' => $round->id,
                'round_name' => $round->name,
                'stage' => $round->stage->value,
                'status' => $status,
                'opponent' => $opponent,
                'has_multiple_legs' => $hasMultipleLegs,
                'aggregate' => $hasMultipleLegs ? [
                    'team_score' => $teamTotalScore,
                    'opponent_score' => $oppTotalScore,
                ] : null,
                'matches' => $matches,
                'won' => $won,
                'is_eliminated' => $stageEliminated,
            ];
        }

        return $stages;
    }

    private function buildSummary(Tournament $tournament, Team $team, ?array $group, array $knockout): array
    {
        $totalMatches = 0;
        $totalWins = 0;
        $totalDraws = 0;
        $totalLosses = 0;

        if ($group) {
            $totalMatches += (int) ($group['played'] ?? 0);
            $totalWins += (int) ($group['won'] ?? ($group['wins'] ?? 0));
            $totalDraws += (int) ($group['drawn'] ?? ($group['draws'] ?? 0));
            $totalLosses += (int) ($group['lost'] ?? ($group['losses'] ?? 0));
        }

        $isChampion = false;
        $currentStageLabel = 'دور المجموعات';

        foreach ($knockout as $stage) {
            foreach ($stage['matches'] ?? [] as $m) {
                if (($m['status'] ?? '') === MatchStatus::Finished->value) {
                    $totalMatches++;
                    if ($m['team_score'] > $m['opponent_score']) {
                        $totalWins++;
                    } elseif ($m['team_score'] < $m['opponent_score']) {
                        $totalLosses++;
                    } else {
                        $totalDraws++;
                    }
                }
            }

            if ($stage['status'] === 'current') {
                $currentStageLabel = $stage['round_name'];
            } elseif ($stage['status'] === 'eliminated') {
                $currentStageLabel = 'أُقصي من ' . $stage['round_name'];
            } elseif ($stage['stage'] === 'final' && ($stage['won'] ?? false)) {
                $isChampion = true;
                $currentStageLabel = 'بطل المسابقة';
            }
        }

        return [
            'current_stage_label' => $currentStageLabel,
            'total_matches' => $totalMatches,
            'total_wins' => $totalWins,
            'total_draws' => $totalDraws,
            'total_losses' => $totalLosses,
            'is_champion' => $isChampion,
        ];
    }
}
