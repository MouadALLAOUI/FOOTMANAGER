<?php

namespace App\Domains\Team\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamGalleryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'image_url' => $this->image_url,
            'caption' => $this->caption,
            'category' => $this->category,
            'order_index' => $this->order_index,
            'is_cover' => $this->is_cover,
            'uploaded_by' => $this->whenLoaded('uploader', fn () => $this->uploader ? [
                'id' => $this->uploader->id,
                'name' => $this->uploader->name,
            ] : null),
            'created_at' => $this->created_at,
        ];
    }
}
