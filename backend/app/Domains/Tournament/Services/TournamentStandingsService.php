<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Competition\Models\Group;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;

class TournamentStandingsService
{
    /**
     * @return array{competition_id: int|null, season_id: int|null, groups: array<int, array{group_id: int|null, name: string|null, rows: array<int, array<string, mixed>>}>, total: int}
     */
    public function standings(Tournament $tournament, ?int $groupId = null): array
    {
        $pointsWin = (int) $tournament->points_for_win;
        $pointsDraw = (int) $tournament->points_for_draw;
        $pointsLoss = (int) $tournament->points_for_loss;

        $matches = FootballMatch::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('status', MatchStatus::Finished)
            ->when($groupId, fn ($q) => $q->where('group_id', $groupId))
            ->get(['id', 'group_id', 'home_team_id', 'away_team_id', 'home_score', 'away_score']);

        $aggregates = [];

        foreach ($matches as $match) {
            foreach ([
                ['team_id' => $match->home_team_id, 'group_id' => $match->group_id, 'for' => $match->home_score, 'against' => $match->away_score, 'result' => $match->home_score <=> $match->away_score],
                ['team_id' => $match->away_team_id, 'group_id' => $match->group_id, 'for' => $match->away_score, 'against' => $match->home_score, 'result' => $match->away_score <=> $match->home_score],
            ] as $row) {
                $teamId = (int) $row['team_id'];

                if (! isset($aggregates[$teamId])) {
                    $aggregates[$teamId] = [
                        'team_id' => $teamId,
                        'group_id' => $row['group_id'],
                        'played' => 0,
                        'wins' => 0,
                        'draws' => 0,
                        'losses' => 0,
                        'goals_for' => 0,
                        'goals_against' => 0,
                        'goal_difference' => 0,
                        'points' => 0,
                        'form' => [],
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

                $resultMark = match ($row['result']) {
                    1 => 'W',
                    0 => 'D',
                    -1 => 'L',
                    default => null,
                };

                if ($resultMark) {
                    $aggregates[$teamId]['form'][] = $resultMark;
                }
            }
        }

        $pivots = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->when($groupId, fn ($q) => $q->where('group_id', $groupId))
            ->get(['team_id', 'group_id']);

        foreach ($pivots as $pivot) {
            $teamId = (int) $pivot->team_id;

            if (! isset($aggregates[$teamId])) {
                $aggregates[$teamId] = [
                    'team_id' => $teamId,
                    'group_id' => $pivot->group_id,
                    'played' => 0,
                    'wins' => 0,
                    'draws' => 0,
                    'losses' => 0,
                    'goals_for' => 0,
                    'goals_against' => 0,
                    'goal_difference' => 0,
                    'points' => 0,
                    'form' => [],
                ];
            }

            $aggregates[$teamId]['group_id'] = $pivot->group_id;
        }

        $teamIds = array_map('intval', array_keys($aggregates));
        $teams = $teamIds ? Team::query()->withTrashed()->whereKey($teamIds)->get(['id', 'name', 'logo_path', 'city']) : collect();

        $rows = [];

        foreach ($aggregates as &$agg) {
            $team = $teams->firstWhere('id', $agg['team_id']);
            $agg['goal_difference'] = $agg['goals_for'] - $agg['goals_against'];
            $agg['points'] = $agg['wins'] * $pointsWin + $agg['draws'] * $pointsDraw + $agg['losses'] * $pointsLoss;
            $agg['form'] = array_slice(array_values($agg['form']), -5);
            $agg['team'] = $team ? [
                'id' => $team->id,
                'name' => $team->name,
                'logo_url' => $team->logo_url,
                'city' => $team->city,
            ] : null;
            $rows[] = $agg;
        }
        unset($agg);

        usort($rows, function (array $a, array $b) {
            return $b['points'] <=> $a['points']
                ?: $b['goal_difference'] <=> $a['goal_difference']
                ?: $b['goals_for'] <=> $a['goals_for']
                ?: $a['team_id'] <=> $b['team_id'];
        });

        $groupRows = [];
        foreach ($rows as $row) {
            $groupRows[$row['group_id'] ?: 'unassigned'][] = $row;
        }

        $groups = [];
        foreach ($groupRows as $groupId => $groupTeams) {
            $groups[] = [
                'group_id' => $groupId === 'unassigned' ? null : (int) $groupId,
                'name' => $this->groupName($groupId),
                'rows' => $groupTeams,
            ];
        }

        usort($groups, fn (array $a, array $b) => strcmp((string) $a['name'], (string) $b['name']));

        return [
            'competition_id' => $tournament->competition_id,
            'season_id' => $tournament->season_id,
            'groups' => $groups,
            'total' => count($rows),
        ];
    }

    public function rebuildGroup(Tournament $tournament, ?int $groupId = null): array
    {
        return $this->standings($tournament, $groupId);
    }

    private function groupName(mixed $groupId): ?string
    {
        if ($groupId === 'unassigned' || $groupId === null) {
            return null;
        }

        $group = Group::find($groupId);

        return $group?->name;
    }
}
