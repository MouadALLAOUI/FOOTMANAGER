<?php

namespace App\Domains\Player\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlayerAchievementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $achievement = $this->achievement;
        $locale = $request->user()?->playerProfile?->language ?? 'ar';

        return [
            'id' => $this->id,
            'key' => $achievement?->key,
            'title' => $achievement?->title($locale),
            'description' => $achievement?->description($locale),
            'icon' => $achievement?->icon,
            'category' => $achievement?->category,
            'points' => $achievement?->points,
            'progress' => $this->progress,
            'is_unlocked' => $this->is_unlocked,
            'unlocked_at' => $this->unlocked_at?->toIso8601String(),
        ];
    }
}
