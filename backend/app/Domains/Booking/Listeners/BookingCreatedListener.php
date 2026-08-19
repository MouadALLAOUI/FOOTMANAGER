<?php

namespace App\Domains\Booking\Listeners;

use App\Domains\Booking\Events\BookingCreated;
use App\Domains\Booking\Notifications\NewBookingRequestNotification;
use App\Domains\Notification\Services\NotificationService;

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

        NotificationService::push(
            (int) $owner->id,
            'new_booking_request',
            'طلب حجز جديد',
            'طلب حجز جديد من فريق '.($booking->team?->name ?? '')
                .' بتاريخ '.$booking->booking_date?->format('Y-m-d')
                .' الساعة '.$booking->start_time,
            [
                'booking_id' => $booking->id,
                'terrain_id' => $booking->terrain_id,
                'reference' => $booking->booking_reference,
            ],
            '/owner/bookings',
        );
    }
}
