<?php

namespace App\Domains\Booking\Events;

use App\Domains\Booking\Models\TerrainBooking;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

class BookingCancelled
{
    use Dispatchable;

    public function __construct(
        public TerrainBooking $booking,
        public ?User $by = null,
    ) {}
}
