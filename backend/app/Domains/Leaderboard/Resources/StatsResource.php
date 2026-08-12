<?php

namespace App\Domains\Leaderboard\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StatsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'teams' => $this->resource['total_teams'] ?? 0,
            'players' => $this->resource['total_players'] ?? 0,
            'stadiums' => $this->resource['total_stadiums'] ?? 0,
            'matches' => $this->resource['total_matches'] ?? 0,
            'upcoming_matches' => $this->resource['upcoming_matches'] ?? 0,
            'live_matches' => $this->resource['live_matches'] ?? 0,
            'bookings' => $this->resource['total_bookings'] ?? 0,
            'updated_at' => $this->resource['updated_at'] ?? null,
        ];
    }
}
