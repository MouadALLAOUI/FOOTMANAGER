<?php

namespace App\Domains\Booking\Listeners;

use App\Domains\Booking\Events\BookingCancelled;
use App\Domains\Booking\Notifications\BookingCancelledNotification;
use App\Domains\Notification\Models\AppNotification;

class BookingCancelledListener
{
    public function handle(BookingCancelled $event): void
    {
        $booking = $event->booking;
        $by = $event->by;
        $owner = $booking->terrain?->owner;
        $manager = $booking->manager;

        if ($by === null) {
            $this->notifyOwner($booking, $owner);
            $this->notifyManager($booking, $manager);

            return;
        }

        if ((int) $by->id === (int) $booking->manager_id) {
            $this->notifyOwner($booking, $owner);

            return;
        }

        $this->notifyManager($booking, $manager);
    }

    private function notifyOwner($booking, $owner): void
    {
        if (! $owner) {
            return;
        }

        $owner->notify(new BookingCancelledNotification($booking, wasManager: false));

        AppNotification::create([
            'user_id' => $owner->id,
            'type' => 'booking_cancelled',
            'title' => 'تم إلغاء حجز على ملعبك',
            'body' => 'ألغى '.($booking->team?->name ?? 'الفريق')
                .' حجزه بتاريخ '.$booking->booking_date?->format('Y-m-d')
                .' الساعة '.$booking->start_time
                .' (المرجع: '.$booking->booking_reference.')',
            'data' => [
                'booking_id' => $booking->id,
                'reference' => $booking->booking_reference,
                'refund_percentage' => $booking->refund_percentage,
                'refund_amount' => $booking->refund_amount,
            ],
            'action_url' => '/owner/bookings',
        ]);
    }

    private function notifyManager($booking, $manager): void
    {
        if (! $manager) {
            return;
        }

        $manager->notify(new BookingCancelledNotification($booking, wasManager: true));

        AppNotification::create([
            'user_id' => $manager->id,
            'type' => 'booking_cancelled',
            'title' => 'تم إلغاء حجزك',
            'body' => 'تم إلغاء حجزك على ملعب '.($booking->terrain?->name ?? '')
                .' بتاريخ '.$booking->booking_date?->format('Y-m-d'),
            'data' => [
                'booking_id' => $booking->id,
                'reference' => $booking->booking_reference,
                'refund_percentage' => $booking->refund_percentage,
                'refund_amount' => $booking->refund_amount,
            ],
            'action_url' => '/dashboard/my-reservations',
        ]);
    }
}
