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
            'type' => $this->type?->value ?? (string) $this->type,
            'icon' => $this->icon ?? $this->type?->icon(),
            'punishment' => $this->punishment?->value ?? (is_string($this->punishment) ? $this->punishment : null),
            'minute' => $this->minute,
            'added_time' => $this->added_time,
            'period' => $this->period,
            'description' => $this->description,
            'metadata' => $this->metadata,
            'player_name' => $this->whenLoaded('player', fn () => $this->player?->full_name ?? $this->player?->name),
            'player' => $this->whenLoaded('player', fn () => $this->player ? [
                'id' => $this->player->id,
                'name' => $this->player->full_name ?? $this->player->name,
                'number' => $this->player->number,
            ] : null),
            'assist_player_name' => $this->whenLoaded('assistPlayer', fn () => $this->assistPlayer?->full_name ?? $this->assistPlayer?->name),
            'assist_player' => $this->whenLoaded('assistPlayer', fn () => $this->assistPlayer ? [
                'id' => $this->assistPlayer->id,
                'name' => $this->assistPlayer->full_name ?? $this->assistPlayer->name,
                'number' => $this->assistPlayer->number,
            ] : null),
            'team_name' => $this->whenLoaded('team', fn () => $this->team?->name),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
