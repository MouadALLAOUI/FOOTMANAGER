<?php

namespace App\Domains\Tournament\Resources;

use App\Domains\Tournament\Models\TournamentTeam;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin TournamentTeam */
class TournamentRegistrationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tournament_id' => $this->tournament_id,
            'team' => $this->whenLoaded('team', fn () => [
                'id' => $this->team->id,
                'name' => $this->team->name,
                'logo_url' => $this->team->logo_url,
                'city' => $this->team->city,
                'category' => $this->team->category,
                'level' => $this->team->level,
            ]),
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
