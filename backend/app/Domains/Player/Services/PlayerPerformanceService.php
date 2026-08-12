<?php

namespace App\Domains\Player\Services;

use App\Domains\Player\Models\PlayerMatchStat;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class PlayerPerformanceService
{
    public function recentMatches(User $user, int $limit = 10): Collection
    {
        return PlayerMatchStat::query()
            ->where('user_id', $user->id)
            ->where('played', true)
            ->with('matchRequest:id,match_datetime,status,host_score,opponent_score,host_team_id,opponent_team_id')
            ->orderByDesc('match_date')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    public function monthlyHeatmap(User $user): array
    {
        $rows = PlayerMatchStat::query()
            ->where('user_id', $user->id)
            ->selectRaw("DATE_FORMAT(match_date, '%Y-%m') as month")
            ->selectRaw('COUNT(*) as matches')
            ->selectRaw('SUM(goals) as goals')
            ->selectRaw('SUM(CASE WHEN result = ? THEN 1 ELSE 0 END) as wins', [PlayerMatchStat::RESULT_WIN])
            ->whereNotNull('match_date')
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        return $rows->map(function ($row) {
            return [
                'month' => $row->month,
                'matches' => (int) $row->matches,
                'goals' => (int) $row->goals,
                'wins' => (int) $row->wins,
            ];
        })->values()->toArray();
    }

    public function positionBreakdown(User $user): array
    {
        $rows = PlayerMatchStat::query()
            ->where('user_id', $user->id)
            ->join('teams', 'teams.id', '=', 'player_match_stats.team_id')
            ->selectRaw("COALESCE(NULLIF(teams.level, ''), 'unknown') as level")
            ->selectRaw('COUNT(*) as matches')
            ->selectRaw('SUM(goals) as goals')
            ->selectRaw('SUM(assists) as assists')
            ->groupBy('level')
            ->orderByDesc('matches')
            ->get();

        return $rows->map(function ($row) {
            return [
                'level' => $row->level,
                'matches' => (int) $row->matches,
                'goals' => (int) $row->goals,
                'assists' => (int) $row->assists,
            ];
        })->values()->toArray();
    }

    public function bestPerformances(User $user, int $limit = 5): Collection
    {
        return PlayerMatchStat::query()
            ->where('user_id', $user->id)
            ->whereNotNull('rating')
            ->orderByDesc('rating')
            ->orderByDesc('goals')
            ->with('matchRequest:id,match_datetime,status,host_score,opponent_score,host_team_id,opponent_team_id')
            ->limit($limit)
            ->get();
    }
}
