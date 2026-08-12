<?php

namespace App\Domains\Review\Listeners;

use App\Domains\Review\Events\StadiumReviewed;
use App\Domains\Review\Models\StadiumReview;
use Illuminate\Contracts\Queue\ShouldQueue;

class StadiumReviewedListener implements ShouldQueue
{
    public function handle(StadiumReviewed $event): void
    {
        $stadium = $event->review->stadium;

        if (! $stadium) {
            return;
        }

        $avg = (float) StadiumReview::query()
            ->where('stadium_id', $stadium->id)
            ->where('status', StadiumReview::STATUS_ACTIVE)
            ->avg('overall_rating');

        $count = StadiumReview::query()
            ->where('stadium_id', $stadium->id)
            ->where('status', StadiumReview::STATUS_ACTIVE)
            ->count();

        $stadium->forceFill([
            'rating' => round($avg, 2),
            'reviews_count' => $count,
        ])->saveQuietly();
    }
}
