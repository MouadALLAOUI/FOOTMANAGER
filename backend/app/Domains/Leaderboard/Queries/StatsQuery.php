<?php

namespace App\Domains\Leaderboard\Queries;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Match\Models\MatchRequest;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class StatsQuery
{
    public static function teams(): Builder
    {
        return Team::query()->whereHas('manager', function ($q) {
            $q->where('status', 'approved');
        });
    }

    public static function players(): Builder
    {
        return User::query()->where('role', 'player')->where('status', 'approved');
    }

    public static function stadiums(): Builder
    {
        return Stadium::query()
            ->where('is_available', true)
            ->whereHas('owner', function ($q) {
                $q->where('status', 'approved');
            });
    }

    public static function matches(): Builder
    {
        return MatchRequest::query();
    }

    public static function bookings(): Builder
    {
        return TerrainBooking::query();
    }
}
