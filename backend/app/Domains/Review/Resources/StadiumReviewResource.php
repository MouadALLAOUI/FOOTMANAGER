<?php

namespace App\Domains\Review\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StadiumReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'stadium_id' => $this->stadium_id,
            'booking_id' => $this->booking_id,
            'overall_rating' => $this->overall_rating,
            'field_quality' => $this->field_quality,
            'lighting' => $this->lighting,
            'cleanliness' => $this->cleanliness,
            'facilities' => $this->facilities,
            'parking' => $this->parking,
            'comment' => $this->comment,
            'photos' => $this->photos,
            'recommend' => $this->recommend,
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'avatar' => $this->user->playerProfile?->photo_url,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
