<?php

namespace App\Domains\Booking\Notifications;

use App\Domains\Booking\Models\TerrainBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BookingConfirmedNotification extends Notification
{
    use Queueable;

    public function __construct(private TerrainBooking $booking) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $booking = $this->booking;

        return (new MailMessage)
            ->subject('تم تأكيد حجزك — '.($booking->terrain?->name ?? 'ملعب'))
            ->greeting('مرحباً،')
            ->line('تم تأكيد حجزك على الملعب: '.($booking->terrain?->name ?? ''))
            ->line('التاريخ: '.$booking->booking_date?->format('Y-m-d'))
            ->line('التوقيت: '.$booking->start_time.' - '.$booking->end_time)
            ->line('مرجع الحجز: '.$booking->booking_reference)
            ->action('عرض الحجز', url('/dashboard/my-reservations'))
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
