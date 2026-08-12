<?php

namespace App\Domains\Booking\Notifications;

use App\Domains\Booking\Models\TerrainBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewBookingRequestNotification extends Notification
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
            ->subject('طلب حجز جديد — '.($booking->terrain?->name ?? 'ملعب'))
            ->greeting('مرحباً،')
            ->line('لديك طلب حجز جديد على ملعبك: '.($booking->terrain?->name ?? ''))
            ->line('الفريق: '.($booking->team?->name ?? ''))
            ->line('التاريخ: '.$booking->booking_date?->format('Y-m-d'))
            ->line('التوقيت: '.$booking->start_time.' - '.$booking->end_time)
            ->line('مرجع الحجز: '.$booking->booking_reference)
            ->action('مراجعة الحجز', url('/owner/bookings'))
            ->line('شكراً لاستخدامك منصة FootMANAGER.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'booking_id' => $this->booking->id,
            'terrain_id' => $this->booking->terrain_id,
            'reference' => $this->booking->booking_reference,
        ];
    }
}
