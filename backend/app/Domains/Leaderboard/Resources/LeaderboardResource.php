<?php

namespace App\Domains\Leaderboard\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeaderboardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'logo_url' => $this->logo_url,
            'category' => $this->category,
            'level' => $this->level,
            'city' => $this->city,
            'primary_color' => $this->primary_color,
            'secondary_color' => $this->secondary_color,
            'member_count' => $this->member_count,
            'points' => $this->points,
            'matches_played' => $this->matches_played,
            'wins' => $this->wins,
            'draws' => $this->draws,
            'losses' => $this->losses,
            'goals_for' => $this->goals_for,
            'goals_against' => $this->goals_against,
            'goal_difference' => $this->goal_difference,
            'primary_stadium' => $this->whenLoaded('primaryStadium', fn () => [
                'id' => $this->primaryStadium->id,
                'name' => $this->primaryStadium->name,
                'city' => $this->primaryStadium->city,
            ]),
        ];
    }
}
