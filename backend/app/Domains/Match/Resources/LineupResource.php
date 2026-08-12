<?php

namespace App\Domains\Match\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LineupResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'team_id' => $this->team_id,
            'team_name' => $this->whenLoaded('team', fn () => $this->team?->name),
            'players' => $this->whenLoaded('players', fn () => $this->players),
            'starters' => $this->whenLoaded('starters', fn () => $this->starters),
            'bench' => $this->whenLoaded('bench', fn () => $this->bench),
            'formation' => $this->formation,
        ];
    }
}
