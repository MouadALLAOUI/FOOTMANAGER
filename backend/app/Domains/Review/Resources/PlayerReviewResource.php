<?php

namespace App\Domains\Review\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlayerReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'player_id' => $this->player_id,
            'match_id' => $this->match_id,
            'rating' => $this->rating,
            'sportsmanship' => $this->sportsmanship,
            'teamwork' => $this->teamwork,
            'skill' => $this->skill,
            'punctuality' => $this->punctuality,
            'comment' => $this->comment,
            'is_anonymous' => $this->is_anonymous,
            'reviewer' => $this->whenLoaded('reviewer', fn () => [
                'id' => $this->reviewer->id,
                'name' => $this->is_anonymous ? null : $this->reviewer->name,
                'avatar' => $this->is_anonymous ? null : $this->reviewer->playerProfile?->photo_url,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
