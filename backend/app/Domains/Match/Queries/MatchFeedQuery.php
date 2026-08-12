<?php

namespace App\Domains\Match\Queries;

use App\Domains\Match\Models\MatchRequest;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class MatchFeedQuery
{
    public static function base(?int $excludeTeamId = null): Builder
    {
        $query = MatchRequest::with([
            'hostTeam.manager',
            'hostTeam.primaryStadium',
            'stadium.images',
            'playerApplications',
        ])
            ->withCount(['playerApplications as players_joined_count' => fn ($q) => $q->where('status', 'accepted')])
            ->where('status', 'open')
            ->where(function ($q) {
                $q->where('type', 'public_request')
                    ->orWhereNull('type');
            })
            ->whereHas('hostTeam.manager', function ($q) {
                $q->where('status', 'approved');
            })
            ->orderBy('match_datetime', 'asc');

        if ($excludeTeamId) {
            $query->where('host_team_id', '!=', $excludeTeamId);
        }

        return $query;
    }

    public static function applyFilters(Builder $query, Request $request): Builder
    {
        if ($request->filled('stadium_id')) {
            $query->where('stadium_id', $request->query('stadium_id'));
        }

        if ($request->filled('category')) {
            $query->whereHas('hostTeam', function ($q) use ($request) {
                $q->where('category', $request->query('category'));
            });
        }

        if ($request->filled('city_id')) {
            $query->whereHas('hostTeam', function ($q) use ($request) {
                $q->where('city_id', $request->query('city_id'));
            });
        }

        if ($request->filled('city')) {
            $query->whereHas('hostTeam', function ($q) use ($request) {
                $q->where('city', $request->query('city'));
            });
        }

        if ($request->filled('date')) {
            $query->whereDate('match_datetime', $request->query('date'));
        }

        if ($request->filled('player_format')) {
            $query->whereHas('stadium', function ($q) use ($request) {
                $q->where('player_format', $request->query('player_format'));
            });
        }

        if ($request->filled('level')) {
            $query->whereHas('hostTeam', function ($q) use ($request) {
                $q->where('level', $request->query('level'));
            });
        }

        if ($request->filled('search')) {
            $search = trim($request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->whereHas('hostTeam', fn ($t) => $t->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('stadium', fn ($s) => $s->where('name', 'like', "%{$search}%"))
                    ->orWhere('custom_terrain_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('sort')) {
            if ($request->query('sort') === 'newest') {
                $query->reorder('match_datetime', 'desc');
            }
        }

        return $query;
    }
}
