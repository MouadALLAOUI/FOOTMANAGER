<?php

namespace App\Domains\Review\Queries;

use App\Domains\Player\Models\Player;
use App\Domains\Review\Models\PlayerReview;
use Illuminate\Database\Eloquent\Builder;

class PlayerReviewQuery
{
    public function base(Player $player): Builder
    {
        return PlayerReview::query()
            ->where('player_id', $player->id)
            ->where('status', PlayerReview::STATUS_ACTIVE)
            ->with('reviewer:id,name')
            ->with('reviewer.playerProfile:id,user_id,photo_path');
    }

    public function applySort(Builder $query, ?string $sort): Builder
    {
        return match ($sort) {
            'highest' => $query->orderByDesc('rating'),
            'lowest' => $query->orderBy('rating'),
            default => $query->orderByDesc('created_at'),
        };
    }
}
