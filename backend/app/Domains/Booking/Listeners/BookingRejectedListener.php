<?php

namespace App\Domains\Booking\Listeners;

use App\Domains\Booking\Events\BookingRejected;
use App\Domains\Booking\Notifications\BookingRejectedNotification;

class BookingRejectedListener
{
    public function handle(BookingRejected $event): void
    {
        if ($event->booking->terrain_id) {
            \App\Domains\Booking\Services\SlotAvailabilityService::invalidate($event->booking->terrain_id);
        }
        $manager = $event->booking->manager;
        if ($manager) {
            $manager->notify(new BookingRejectedNotification($event->booking));
        }
    }
}
