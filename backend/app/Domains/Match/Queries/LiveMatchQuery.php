<?php

namespace App\Domains\Match\Queries;

use App\Domains\Match\Models\MatchRequest;
use Illuminate\Database\Eloquent\Builder;

class LiveMatchQuery
{
    public static function base(): Builder
    {
        $now = now();

        return MatchRequest::with([
            'hostTeam.manager',
            'opponentTeam.manager',
            'stadium.images',
        ])
            ->where('status', 'accepted')
            ->whereNull('host_score')
            ->where('match_datetime', '<=', $now)
            ->where('match_datetime', '>=', $now->copy()->subHours(2))
            ->orderBy('match_datetime', 'asc');
    }
}
