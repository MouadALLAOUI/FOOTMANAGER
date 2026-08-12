<?php

namespace App\Domains\Chat\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChatMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'match_id' => $this->match_id,
            'type' => $this->type,
            'message' => $this->message,
            'is_pinned' => $this->is_pinned,
            'is_edited' => $this->is_edited,
            'is_system' => $this->is_system,
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'role' => $this->user->role,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
