<?php

namespace App\Domains\Review\Events;

use App\Domains\Review\Models\StadiumReview;
use Illuminate\Foundation\Events\Dispatchable;

class StadiumReviewed
{
    use Dispatchable;

    public function __construct(public StadiumReview $review) {}
}
