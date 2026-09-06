<?php

namespace App\Domains\Team\Resources;

use App\Domains\Team\Support\FormationPresets;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FormationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $players = $this->whenLoaded('players', fn () => $this->players, collect());

        return [
            'id' => $this->id,
            'team_id' => $this->team_id,
            'name' => $this->name,
            'format' => $this->format,
            'formation' => $this->formation,
            'preset_key' => $this->preset_key,
            'is_active' => $this->is_active,
            'players' => $players->map(fn ($entry) => [
                'player_id' => $entry->player_id,
                'name' => $entry->player?->name,
                'number' => $entry->player?->number,
                'position' => $entry->player?->position,
                'tactical_position' => $entry->tactical_position,
                'role' => $entry->role,
                'x' => $entry->x,
                'y' => $entry->y,
                'is_starter' => $entry->is_starter,
                'sort_order' => $entry->sort_order,
            ])->values()->all(),
            'starters_count' => $players->where('is_starter', true)->count(),
            'substitutes_count' => $players->where('is_starter', false)->count(),
            'required_starters' => $this->format ? FormationPresets::startersForFormat((string) $this->format) : null,
            'captain' => $this->whenLoaded('captain', fn () => $this->captain ? [
                'id' => $this->captain->id,
                'name' => $this->captain->name,
                'number' => $this->captain->number,
            ] : null),
            'vice_captain' => $this->whenLoaded('viceCaptain', fn () => $this->viceCaptain ? [
                'id' => $this->viceCaptain->id,
                'name' => $this->viceCaptain->name,
                'number' => $this->viceCaptain->number,
            ] : null),
            'captain_id' => $this->captain_id,
            'vice_captain_id' => $this->vice_captain_id,
            'free_kick_taker_id' => $this->free_kick_taker_id,
            'penalty_taker_id' => $this->penalty_taker_id,
            'corner_taker_id' => $this->corner_taker_id,
            'updated_at' => $this->updated_at,
        ];
    }
}
