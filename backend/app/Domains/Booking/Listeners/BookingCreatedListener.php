<?php

namespace App\Domains\Booking\Listeners;

use App\Domains\Booking\Events\BookingCreated;
use App\Domains\Booking\Notifications\NewBookingRequestNotification;
use App\Domains\Notification\Models\AppNotification;

class BookingCreatedListener
{
    public function handle(BookingCreated $event): void
    {
        $booking = $event->booking;
        $owner = $booking->terrain?->owner;

        if (! $owner) {
            return;
        }

        $owner->notify(new NewBookingRequestNotification($booking));

        AppNotification::create([
            'user_id' => $owner->id,
            'type' => 'new_booking_request',
            'title' => 'طلب حجز جديد',
            'body' => 'طلب حجز جديد من فريق '.($booking->team?->name ?? '')
                .' بتاريخ '.$booking->booking_date?->format('Y-m-d')
                .' الساعة '.$booking->start_time,
            'data' => [
                'booking_id' => $booking->id,
                'terrain_id' => $booking->terrain_id,
                'reference' => $booking->booking_reference,
            ],
            'action_url' => '/owner/bookings',
        ]);
    }
}
