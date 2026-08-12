<?php

namespace App\Domains\Leaderboard\Services;

use App\Domains\Leaderboard\Queries\StatsQuery;
use App\Domains\Match\Queries\LiveMatchQuery;
use Illuminate\Support\Facades\Cache;

class CommunityStatsService
{
    public function stats(): array
    {
        return Cache::remember('api.v1.stats', now()->addMinutes(10), function () {
            $now = now();

            return [
                'total_teams' => StatsQuery::teams()->count(),
                'total_players' => StatsQuery::players()->count(),
                'total_stadiums' => StatsQuery::stadiums()->count(),
                'total_matches' => StatsQuery::matches()->where('status', 'completed')->count(),
                'upcoming_matches' => StatsQuery::matches()
                    ->where('status', 'open')
                    ->where('match_datetime', '>', $now)
                    ->count(),
                'live_matches' => LiveMatchQuery::base()->count(),
                'total_bookings' => StatsQuery::bookings()->where('status', 'approved')->count(),
                'updated_at' => $now->toIso8601String(),
            ];
        });
    }
}
