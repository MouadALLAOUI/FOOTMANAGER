<?php

namespace App\Domains\Tournament\Resources;

use App\Domains\Tournament\Models\Tournament;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Tournament */
class TournamentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'location' => $this->location,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'status' => $this->status,
            'tournament_format' => $this->tournament_format,
            'teams_count' => $this->teams_count,
            'groups_count' => $this->groups_count,
            'teams_per_group' => $this->teams_per_group,
            'points_for_win' => $this->points_for_win,
            'points_for_draw' => $this->points_for_draw,
            'points_for_loss' => $this->points_for_loss,
            'organizer' => $this->whenLoaded('organizer', fn () => [
                'id' => $this->organizer->id,
                'name' => $this->organizer->name,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
