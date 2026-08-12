<?php

namespace App\Domains\Review\Events;

use App\Domains\Review\Models\PlayerReview;
use Illuminate\Foundation\Events\Dispatchable;

class PlayerReviewed
{
    use Dispatchable;

    public function __construct(public PlayerReview $review) {}
}
