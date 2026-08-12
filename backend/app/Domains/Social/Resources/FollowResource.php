<?php

namespace App\Domains\Social\Resources;

use App\Domains\Shared\Support\SubjectPresenter;
use App\Domains\Social\Models\Follow;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FollowResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        if ($this->resource instanceof Follow) {
            return [
                'id' => $this->id,
                'follower' => $this->whenLoaded('follower', fn () => [
                    'id' => $this->follower->id,
                    'name' => $this->follower->name,
                    'role' => $this->follower->role,
                ]),
                'followable' => $this->whenLoaded('followable', fn () => SubjectPresenter::summarize($this->followable)),
                'created_at' => $this->created_at?->toIso8601String(),
            ];
        }

        return [
            'following' => (bool) ($this['following'] ?? false),
            'followers_count' => (int) ($this['followers_count'] ?? 0),
        ];
    }
}
