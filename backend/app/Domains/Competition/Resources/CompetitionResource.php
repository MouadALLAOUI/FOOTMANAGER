<?php

namespace App\Domains\Competition\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompetitionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'type' => $this->type->value,
            'logo_url' => $this->logo_url,
            'description' => $this->description,
            'country' => $this->country,
            'active' => (bool) $this->active,
            'settings' => $this->settings,
            'seasons_count' => $this->whenCounted('seasons'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
