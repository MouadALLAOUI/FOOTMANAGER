<?php

namespace App\Domains\Social\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'is_edited' => $this->is_edited,
            'is_pinned' => $this->is_pinned,
            'likes_count' => $this->likes_count ?? $this->likes()->count(),
            'liked_by_me' => (bool) ($this->liked_by_me ?? false),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'role' => $this->user->role,
            ]),
            'replies_count' => $this->whenCounted('replies', fn () => $this->replies_count),
            'created_at' => $this->created_at?->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
        ];
    }
}
