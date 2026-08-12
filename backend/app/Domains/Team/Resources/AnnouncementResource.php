<?php

namespace App\Domains\Team\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnnouncementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'message' => $this->message,
            'priority' => $this->priority,
            'visibility' => $this->visibility,
            'target_player_ids' => $this->target_player_ids ?? [],
            'is_pinned' => $this->is_pinned,
            'scheduled_at' => $this->scheduled_at,
            'published_at' => $this->published_at,
            'status' => $this->isPublished() ? 'published' : ($this->isScheduled() ? 'scheduled' : 'draft'),
            'read_by_viewer' => $this->read_by_viewer ?? false,
            'unread_count' => $this->unread_count ?? 0,
            'reads_count' => $this->reads_count ?? $this->reads()->count(),
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ] : null),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
