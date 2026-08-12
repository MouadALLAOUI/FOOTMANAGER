<?php

namespace App\Domains\Player\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlayerCareerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'team' => [
                'id' => $this->team?->id,
                'name' => $this->team_name,
                'logo_url' => $this->team?->logo_url,
            ],
            'joined_at' => $this->joined_at?->toDateString(),
            'left_at' => $this->left_at?->toDateString(),
            'is_current' => (bool) $this->is_current,
            'matches_played' => $this->matches_played,
            'goals' => $this->goals,
            'achievements' => $this->achievements ?? [],
        ];
    }
}
