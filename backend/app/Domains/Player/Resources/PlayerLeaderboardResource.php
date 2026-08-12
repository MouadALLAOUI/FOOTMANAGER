<?php

namespace App\Domains\Player\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlayerLeaderboardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $profile = $this->resource['profile'];
        $user = $profile->relationLoaded('user') ? $profile->user : null;

        return [
            'id' => $profile->id,
            'rank' => $this->resource['rank'],
            'user' => [
                'id' => $user?->id,
                'name' => $user?->name,
            ],
            'position' => $profile->position,
            'skill_level' => $profile->skill_level,
            'city' => $profile->city,
            'photo_url' => $profile->photo_url,
            'points' => $profile->points,
            'matches_played' => $profile->matches_played,
            'wins' => $profile->wins,
            'draws' => $profile->draws,
            'losses' => $profile->losses,
            'rating' => (float) $profile->rating,
            'overall_rating' => (float) $profile->overall_rating,
        ];
    }
}
