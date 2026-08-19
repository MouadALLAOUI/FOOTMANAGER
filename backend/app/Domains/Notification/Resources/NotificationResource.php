<?php

namespace App\Domains\Notification\Resources;

use App\Domains\Notification\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'category' => NotificationService::categoryOf($this->type),
            'title' => $this->title,
            'body' => $this->body,
            'data' => $this->data,
            'action_url' => $this->action_url,
            'is_read' => $this->is_read,
            'is_pinned' => $this->is_pinned,
            'is_important' => $this->is_important,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
