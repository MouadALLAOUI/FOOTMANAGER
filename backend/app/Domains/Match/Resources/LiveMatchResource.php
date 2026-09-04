<?php

namespace App\Domains\Match\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LiveMatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $elapsed = (int) $this->match_datetime->diffInMinutes(now());

        return [
            'id' => $this->id,
            'type' => $this->type ?? 'public_request',
            'status' => 'live',
            'minute' => max(0, min(180, $elapsed)),
            'started_at' => $this->match_datetime?->toIso8601String(),
            'host_team' => $this->whenLoaded('hostTeam', fn () => new TeamResource($this->hostTeam)),
            'opponent_team' => $this->whenLoaded('opponentTeam', fn () => new TeamResource($this->opponentTeam)),
            'stadium' => $this->whenLoaded('stadium', fn () => [
                'id' => $this->stadium->id,
                'name' => $this->stadium->name,
                'type' => $this->stadium->type,
                'city' => $this->stadium->city,
            ]),
            'custom_terrain_name' => $this->custom_terrain_name,
        ];
    }
}
