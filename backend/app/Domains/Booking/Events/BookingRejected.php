<?php

namespace App\Domains\Booking\Events;

use App\Domains\Booking\Models\TerrainBooking;
use Illuminate\Foundation\Events\Dispatchable;

class BookingRejected
{
    use Dispatchable;

    public function __construct(public TerrainBooking $booking) {}
}
