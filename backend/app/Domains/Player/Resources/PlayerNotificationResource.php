<?php

namespace App\Domains\Player\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlayerNotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'body' => $this->body,
            'data' => $this->data,
            'action_url' => $this->action_url,
            'is_read' => (bool) $this->is_read,
            'is_pinned' => (bool) $this->is_pinned,
            'is_important' => (bool) $this->is_important,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
