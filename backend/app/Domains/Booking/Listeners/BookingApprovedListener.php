<?php

namespace App\Domains\Booking\Listeners;

use App\Domains\Booking\Events\BookingApproved;
use App\Domains\Booking\Notifications\BookingConfirmedNotification;

class BookingApprovedListener
{
    public function handle(BookingApproved $event): void
    {
        $booking = $event->booking;

        if ($booking->confirmed_at === null) {
            $booking->update(['confirmed_at' => now()]);
        }

        $manager = $booking->manager;
        if ($manager) {
            $manager->notify(new BookingConfirmedNotification($booking));
        }
    }
}
