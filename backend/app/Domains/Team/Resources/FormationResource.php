<?php

namespace App\Domains\Team\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FormationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'format' => $this->format,
            'formation' => $this->formation,
            'positions' => $this->positions ?? [],
            'bench' => $this->bench ?? [],
            'substitutes' => $this->substitutes ?? [],
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
            'is_active' => $this->is_active,
            'updated_at' => $this->updated_at,
        ];
    }
}
