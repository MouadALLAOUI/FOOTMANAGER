<?php

namespace App\Domains\Player\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlayerGalleryImageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'image_url' => $this->image_url,
            'category' => $this->category,
            'caption' => $this->caption,
            'is_cover' => (bool) $this->is_cover,
            'order_index' => $this->order_index,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
