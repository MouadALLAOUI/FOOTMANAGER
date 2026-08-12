<?php

namespace App\Domains\Match\Queries;

use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use Illuminate\Database\Eloquent\Builder;

class LiveMatchesQuery
{
    public static function base(): Builder
    {
        return FootballMatch::query()
            ->with([
                'homeTeam',
                'awayTeam',
                'stadium',
                'winnerTeam',
                'matchRequest',
            ])
            ->whereIn('status', MatchStatus::live())
            ->orderBy('kicked_off_at')
            ->orderBy('id');
    }

    public static function forTeam(int $teamId): Builder
    {
        return static::base()
            ->where(fn (Builder $query) => $query
                ->where('home_team_id', $teamId)
                ->orWhere('away_team_id', $teamId));
    }
}
