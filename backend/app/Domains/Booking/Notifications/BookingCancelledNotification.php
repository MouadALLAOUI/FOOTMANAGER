<?php

namespace App\Domains\Booking\Notifications;

use App\Domains\Booking\Models\TerrainBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BookingCancelledNotification extends Notification
{
    use Queueable;

    public function __construct(
        private TerrainBooking $booking,
        private bool $wasManager = true,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $booking = $this->booking;

        $subject = $this->wasManager
            ? 'تم إلغاء حجزك — '.($booking->terrain?->name ?? 'ملعب')
            : 'تم إلغاء حجز من طرف مدير الفريق';

        $message = (new MailMessage)
            ->subject($subject)
            ->greeting('مرحباً،')
            ->line('مرجع الحجز: '.$booking->booking_reference)
            ->line('الملعب: '.($booking->terrain?->name ?? ''))
            ->line('التاريخ: '.$booking->booking_date?->format('Y-m-d'))
            ->line('التوقيت: '.$booking->start_time.' - '.$booking->end_time);

        if ($booking->refund_amount !== null && (float) $booking->refund_amount > 0) {
            $message->line('مبلغ الاسترداد: '.$booking->refund_amount.' درهم');
        }

        $actionUrl = $this->wasManager
            ? url('/dashboard/my-reservations')
            : url('/owner/bookings');

        return $message
            ->action('عرض الحجوزات', $actionUrl)
            ->line('شكراً لاستخدامك منصة FootMANAGER.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'booking_id' => $this->booking->id,
            'reference' => $this->booking->booking_reference,
        ];
    }
}
