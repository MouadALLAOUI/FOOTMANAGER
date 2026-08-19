<?php

namespace App\Domains\Notification\Services;

use App\Domains\Booking\Models\TerrainBooking;

class WhatsAppNotificationService
{
    private const MOROCCO_CODE = '212';

    public function buildBookingRequestMessage(TerrainBooking $booking): string
    {
        $ownerPhone = $booking->terrain?->owner?->phone;

        if (! $ownerPhone) {
            return '';
        }

        $ownerPhone = $this->formatPhone($ownerPhone);

        $bookingTypeLabel = $this->bookingTypeLabel($booking);
        $dateLabel = $booking->booking_date ? $booking->booking_date->format('Y-m-d') : '—';
        $teamName = $booking->team?->name ?? 'غير محدد';
        $partyLabel = $booking->isGuest()
            ? '• الزبون: '.$booking->guest_name
            : '• الفريق: '.$teamName;

        $message = 'السلام عليكم، عندك طلب حجز جديد بانتظار التأكيد! 🏟️'."\n"
            ."\n"
            ."• الملعب: {$booking->terrain->name}"."\n"
            ."• النوع: {$bookingTypeLabel}"."\n"
            .$partyLabel."\n"
            ."• التاريخ: {$dateLabel}"."\n"
            ."• التوقيت: {$booking->start_time} - {$booking->end_time}"."\n"
            ."• الثمن: {$booking->price} درهم"."\n"
            ."\n"
            .'يرجى تأكيد أو رفض الطلب عبر المنصة.';

        return $this->buildWaLink($ownerPhone, $message);
    }

    /**
     * Build a plain WhatsApp chat link for a given phone number.
     */
    public function contactLink(string $phone, string $message = ''): string
    {
        if (! $phone) {
            return '';
        }

        return $this->buildWaLink($this->formatPhone($phone), $message);
    }

    public function buildOwnerDecisionMessage(TerrainBooking $booking, string $status): string
    {
        $isGuest = $booking->isGuest();
        $recipientName = $isGuest ? $booking->guest_name : $booking->manager?->name;
        $recipientPhone = $isGuest ? ($booking->guest_phone ?? '') : $booking->manager?->phone;

        if (! $recipientName) {
            $recipientName = 'المسير';
        }
        if (! $recipientPhone) {
            return '';
        }

        $bookingTypeLabel = $this->bookingTypeLabel($booking);
        $dateLabel = $booking->booking_date ? $booking->booking_date->format('Y-m-d') : '—';
        $teamName = $booking->team?->name ?? 'غير محدد';
        $partyLine = $isGuest
            ? '• الزبون: '.$booking->guest_name
            : '• الفريق: '.$teamName;

        if ($status === 'approved') {
            $message = "مرحباً {$recipientName}، تم تأكيد حجزك بنجاح! ✅"."\n"
                ."\n"
                ."• الملعب: {$booking->terrain->name}"."\n"
                ."• النوع: {$bookingTypeLabel}"."\n"
                .$partyLine."\n"
                ."• التاريخ: {$dateLabel}"."\n"
                ."• التوقيت: {$booking->start_time} - {$booking->end_time}"."\n"
                ."\n"
                .'نتمنى لكم وقتاً ممتعاً! ⚽';
        } else {
            $message = "مرحباً {$recipientName}، تعذر قبول طلب الحجز ❌"."\n"
                ."\n"
                ."• الملعب: {$booking->terrain->name}"."\n"
                ."• النوع: {$bookingTypeLabel}"."\n"
                .$partyLine."\n"
                ."• التاريخ: {$dateLabel}"."\n"
                ."• التوقيت: {$booking->start_time} - {$booking->end_time}"."\n"
                ."\n"
                .'يمكنك تجربة ملعب آخر من خلال المنصة.';
        }

        return $this->buildWaLink($this->formatPhone($recipientPhone), $message);
    }

    private function bookingTypeLabel(TerrainBooking $booking): string
    {
        return match ($booking->booking_type) {
            'match' => 'مباراة ودية',
            'training' => 'حصة تدريبية',
            'private' => 'استعمال خاص',
            default => $booking->booking_type ?? 'حجز',
        };
    }

    private function formatPhone(string $phone): string
    {
        $digits = preg_replace('/[^0-9]/', '', $phone);

        if (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        if (! str_starts_with($digits, self::MOROCCO_CODE)) {
            $digits = self::MOROCCO_CODE.$digits;
        }

        return $digits;
    }

    private function buildWaLink(string $phone, string $message): string
    {
        return 'https://wa.me/'.$phone.'?text='.rawurlencode($message);
    }
}
