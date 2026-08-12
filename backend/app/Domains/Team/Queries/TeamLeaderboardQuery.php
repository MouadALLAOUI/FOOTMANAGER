<?php

namespace App\Domains\Team\Queries;

use App\Domains\Team\Models\Team;
use Illuminate\Database\Eloquent\Builder;

/**
 * Public team leaderboard query (legacy leaderboard endpoint).
 */
class TeamLeaderboardQuery
{
    public const PER_PAGE = 20;

    public static function base(?string $category = null): Builder
    {
        return Team::query()
            ->with(['manager:id,name', 'primaryStadium:id,name,city'])
            ->select([
                'id', 'name', 'logo_path', 'logo_url', 'category',
                'points', 'matches_played', 'wins', 'draws', 'losses',
                'goals_for', 'goals_against', 'goal_difference',
                'primary_color', 'secondary_color', 'member_count',
                'manager_id', 'primary_stadium_id',
            ])
            ->whereHas('manager', fn ($q) => $q->where('status', 'approved'))
            ->when($category !== null && $category !== '', fn (Builder $q) => $q->where('category', $category))
            ->orderByDesc('points')
            ->orderByDesc('goal_difference')
            ->orderByDesc('goals_for')
            ->orderByDesc('wins');
    }
}
