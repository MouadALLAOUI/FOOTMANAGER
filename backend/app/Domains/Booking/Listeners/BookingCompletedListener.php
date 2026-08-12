<?php

namespace App\Domains\Booking\Listeners;

use App\Domains\Booking\Events\BookingCompleted;
use App\Domains\Notification\Models\AppNotification;

class BookingCompletedListener
{
    public function handle(BookingCompleted $event): void
    {
        $booking = $event->booking;
        $owner = $booking->terrain?->owner;
        $manager = $booking->manager;

        if ($owner) {
            AppNotification::create([
                'user_id' => $owner->id,
                'type' => 'booking_completed',
                'title' => 'اكتمل الحجز',
                'body' => 'اكتمل حجز فريق '.($booking->team?->name ?? '')
                    .' بتاريخ '.$booking->booking_date?->format('Y-m-d'),
                'data' => [
                    'booking_id' => $booking->id,
                    'reference' => $booking->booking_reference,
                ],
                'action_url' => '/owner/bookings',
            ]);
        }

        if ($manager) {
            AppNotification::create([
                'user_id' => $manager->id,
                'type' => 'booking_completed',
                'title' => 'اكتمل حجزك',
                'body' => 'اكتمل حجزك على ملعب '.($booking->terrain?->name ?? '')
                    .' بتاريخ '.$booking->booking_date?->format('Y-m-d'),
                'data' => [
                    'booking_id' => $booking->id,
                    'reference' => $booking->booking_reference,
                ],
                'action_url' => '/dashboard/my-reservations',
            ]);
        }
    }
}
