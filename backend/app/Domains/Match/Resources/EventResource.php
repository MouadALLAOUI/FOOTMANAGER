<?php

namespace App\Domains\Match\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'match_id' => $this->match_id,
            'team_id' => $this->team_id,
            'player_id' => $this->player_id,
            'assist_player_id' => $this->assist_player_id,
            'type' => $this->type->value,
            'icon' => $this->icon ?? $this->type->icon(),
            'minute' => $this->minute,
            'added_time' => $this->added_time,
            'period' => $this->period,
            'description' => $this->description,
            'player_name' => $this->whenLoaded('player', fn () => $this->player?->full_name ?? $this->player?->name),
            'team_name' => $this->whenLoaded('team', fn () => $this->team?->name),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
