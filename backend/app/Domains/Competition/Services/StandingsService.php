<?php

namespace App\Domains\Competition\Services;

use App\Domains\Competition\Models\Competition;
use App\Domains\Competition\Models\Standing;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;

class StandingsService
{
    public function rebuildForCompetition(Competition $competition, ?int $seasonId = null, ?int $groupId = null): array
    {
        $matches = FootballMatch::query()
            ->where('competition_id', $competition->id)
            ->where('status', MatchStatus::Finished)
            ->when($seasonId, fn ($q) => $q->where('season_id', $seasonId))
            ->when($groupId, fn ($q) => $q->where('group_id', $groupId))
            ->get(['id', 'season_id', 'group_id', 'home_team_id', 'away_team_id', 'home_score', 'away_score', 'winner_team_id']);

        $aggregates = [];

        foreach ($matches as $match) {
            foreach ([
                ['team_id' => $match->home_team_id, 'for' => $match->home_score, 'against' => $match->away_score, 'result' => $match->home_score <=> $match->away_score],
                ['team_id' => $match->away_team_id, 'for' => $match->away_score, 'against' => $match->home_score, 'result' => $match->away_score <=> $match->home_score],
            ] as $row) {
                $teamId = (int) $row['team_id'];

                if (! isset($aggregates[$teamId])) {
                    $aggregates[$teamId] = [
                        'played' => 0,
                        'wins' => 0,
                        'draws' => 0,
                        'losses' => 0,
                        'goals_for' => 0,
                        'goals_against' => 0,
                        'goal_difference' => 0,
                        'points' => 0,
                        'results' => [],
                        'season_id' => $match->season_id,
                        'group_id' => $match->group_id,
                    ];
                }

                $aggregates[$teamId]['played']++;
                $aggregates[$teamId]['goals_for'] += (int) $row['for'];
                $aggregates[$teamId]['goals_against'] += (int) $row['against'];

                match ($row['result']) {
                    1 => $aggregates[$teamId]['wins']++,
                    0 => $aggregates[$teamId]['draws']++,
                    -1 => $aggregates[$teamId]['losses']++,
                    default => null,
                };

                $aggregates[$teamId]['results'][] = match ($row['result']) {
                    1 => 'W',
                    0 => 'D',
                    -1 => 'L',
                    default => null,
                };
            }
        }

        $rows = [];

        foreach ($aggregates as $teamId => $agg) {
            $agg['goal_difference'] = $agg['goals_for'] - $agg['goals_against'];
            $agg['points'] = $agg['wins'] * 3 + $agg['draws'];
            $agg['form'] = array_slice($agg['results'], -5);
            unset($agg['results']);

            $rows[] = Standing::query()->updateOrCreate(
                [
                    'competition_id' => $competition->id,
                    'season_id' => $agg['season_id'],
                    'group_id' => $agg['group_id'],
                    'team_id' => $teamId,
                ],
                $agg,
            );
        }

        usort($rows, function (Standing $a, Standing $b) {
            return $b->points <=> $a->points
                ?: $b->goal_difference <=> $a->goal_difference
                ?: $b->goals_for <=> $a->goals_for;
        });

        return $rows;
    }

    public function forCompetition(int $competitionId, ?int $seasonId = null, ?int $groupId = null): array
    {
        return Standing::query()
            ->with('team')
            ->where('competition_id', $competitionId)
            ->when($seasonId, fn ($q) => $q->where('season_id', $seasonId))
            ->when($groupId, fn ($q) => $q->where('group_id', $groupId))
            ->orderByDesc('points')
            ->orderByDesc('goal_difference')
            ->orderByDesc('goals_for')
            ->get()
            ->all();
    }
}
