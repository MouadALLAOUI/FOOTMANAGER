<?php

namespace App\Domains\Leaderboard\Queries;

use App\Domains\Team\Models\Team;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class LeaderboardQuery
{
    public static function base(): Builder
    {
        return Team::with(['manager:id,name', 'primaryStadium:id,name,city'])
            ->select([
                'id', 'name', 'city', 'logo_path', 'logo_url', 'category', 'level',
                'points', 'matches_played', 'wins', 'draws', 'losses',
                'goals_for', 'goals_against', 'goal_difference',
                'primary_color', 'secondary_color', 'member_count',
                'manager_id', 'primary_stadium_id',
            ])
            ->whereHas('manager', function ($q) {
                $q->where('status', 'approved');
            });
    }

    public static function applyFilters(Builder $query, Request $request): Builder
    {
        if ($request->filled('category')) {
            $query->where('category', $request->query('category'));
        }

        if ($request->filled('level')) {
            $query->where('level', $request->query('level'));
        }

        if ($request->filled('search')) {
            $search = trim($request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%");
            });
        }

        $query
            ->orderByDesc('points')
            ->orderByDesc('goal_difference')
            ->orderByDesc('goals_for')
            ->orderByDesc('wins');

        return $query;
    }
}
