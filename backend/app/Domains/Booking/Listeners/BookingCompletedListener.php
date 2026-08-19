<?php

namespace App\Domains\Booking\Listeners;

use App\Domains\Booking\Events\BookingCompleted;
use App\Domains\Notification\Services\NotificationService;

class BookingCompletedListener
{
    public function handle(BookingCompleted $event): void
    {
        $booking = $event->booking;
        $owner = $booking->terrain?->owner;
        $manager = $booking->manager;

        if ($owner) {
            NotificationService::push(
                (int) $owner->id,
                'booking_completed',
                'اكتمل الحجز',
                'اكتمل حجز فريق '.($booking->team?->name ?? '')
                    .' بتاريخ '.$booking->booking_date?->format('Y-m-d'),
                [
                    'booking_id' => $booking->id,
                    'reference' => $booking->booking_reference,
                ],
                '/owner/bookings',
            );
        }

        if ($manager) {
            NotificationService::push(
                (int) $manager->id,
                'booking_completed',
                'اكتمل حجزك',
                'اكتمل حجزك على ملعب '.($booking->terrain?->name ?? '')
                    .' بتاريخ '.$booking->booking_date?->format('Y-m-d'),
                [
                    'booking_id' => $booking->id,
                    'reference' => $booking->booking_reference,
                ],
                '/dashboard/my-reservations',
            );
        }
    }
}
