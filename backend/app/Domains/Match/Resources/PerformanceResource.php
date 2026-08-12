<?php

namespace App\Domains\Match\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PerformanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'player_id' => $this->player_id,
            'player_name' => $this->whenLoaded('player', fn () => $this->player?->full_name ?? $this->player?->name),
            'team_id' => $this->team_id,
            'minutes_played' => $this->minutes_played,
            'rating' => $this->rating,
            'goals' => $this->goals,
            'assists' => $this->assists,
            'own_goals' => $this->own_goals,
            'yellow_cards' => $this->yellow_cards,
            'red_cards' => $this->red_cards,
            'saves' => $this->saves,
            'clean_sheet' => (bool) $this->clean_sheet,
            'mvp' => (bool) $this->mvp,
        ];
    }
}
