<?php

namespace App\Domains\Match\Resources;

use App\Domains\Team\Resources\TeamResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MatchFeedResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type ?? 'public_request',
            'status' => $this->status,
            'match_datetime' => $this->match_datetime?->toIso8601String(),
            'notes' => $this->notes,
            'price_per_player' => $this->price_per_player !== null ? (float) $this->price_per_player : null,
            'host_team' => $this->whenLoaded('hostTeam', fn () => new TeamResource($this->hostTeam)),
            'opponent_team' => $this->whenLoaded('opponentTeam', fn () => new TeamResource($this->opponentTeam)),
            'stadium' => $this->whenLoaded('stadium', fn () => [
                'id' => $this->stadium->id,
                'name' => $this->stadium->name,
                'type' => $this->stadium->type,
                'city' => $this->stadium->city,
                'player_format' => $this->stadium->player_format,
                'cover_image_url' => $this->stadium->cover_image_url,
                'images' => $this->stadium->images?->pluck('image_url'),
            ]),
            'custom_terrain_name' => $this->custom_terrain_name,
            'has_custom_terrain' => $this->stadium_id === null,
        ];
    }
}
