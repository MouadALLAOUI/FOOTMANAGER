<?php

namespace App\Domains\Tournament\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TournamentGalleryImageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'image_url' => $this->image_url,
            'thumbnail_url' => $this->thumbnail_url,
            'caption' => $this->caption,
            'order_index' => $this->order_index,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
