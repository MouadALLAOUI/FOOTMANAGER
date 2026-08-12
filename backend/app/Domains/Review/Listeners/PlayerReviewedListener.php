<?php

namespace App\Domains\Review\Listeners;

use App\Domains\Review\Events\PlayerReviewed;
use App\Domains\Review\Models\PlayerReview;
use Illuminate\Contracts\Queue\ShouldQueue;

class PlayerReviewedListener implements ShouldQueue
{
    public function handle(PlayerReviewed $event): void
    {
        $player = $event->review->player;

        if (! $player) {
            return;
        }

        $avg = (float) PlayerReview::query()
            ->where('player_id', $player->id)
            ->where('status', PlayerReview::STATUS_ACTIVE)
            ->avg('rating');

        $count = PlayerReview::query()
            ->where('player_id', $player->id)
            ->where('status', PlayerReview::STATUS_ACTIVE)
            ->count();

        $player->forceFill([
            'rating_avg' => round($avg, 2),
            'reviews_count' => $count,
        ])->saveQuietly();
    }
}
