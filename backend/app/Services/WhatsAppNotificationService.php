<?php

namespace App\Services;

use App\Models\TerrainBooking;

class WhatsAppNotificationService
{
    private const MOROCCO_CODE = '212';

    public function buildBookingRequestMessage(TerrainBooking $booking): string
    {
        $phone = $this->formatPhone($booking->manager->phone);
        $ownerPhone = $this->formatPhone($booking->terrain->owner->phone);

        $bookingTypeLabel = match ($booking->booking_type) {
            'match' => 'مباراة ودية',
            'training' => 'حصة تدريبية',
            'private' => 'استعمال خاص',
            default => $booking->booking_type,
        };

        $message = "السلام عليكم، عندك طلب حجز جديد بانتظار التأكيد! 🏟️" . "\n"
            . "\n"
            . "• الملعب: {$booking->terrain->name}" . "\n"
            . "• النوع: {$bookingTypeLabel}" . "\n"
            . "• الفريق: {$booking->team->name}" . "\n"
            . "• التاريخ: {$booking->booking_date->format('Y-m-d')}" . "\n"
            . "• التوقيت: {$booking->start_time} - {$booking->end_time}" . "\n"
            . "• الثمن: {$booking->price} درهم" . "\n"
            . "\n"
            . "يرجى تأكيد أو رفض الطلب عبر المنصة.";

        return $this->buildWaLink($ownerPhone, $message);
    }

    public function buildOwnerDecisionMessage(TerrainBooking $booking, string $status): string
    {
        $managerPhone = $this->formatPhone($booking->manager->phone);

        $bookingTypeLabel = match ($booking->booking_type) {
            'match' => 'مباراة ودية',
            'training' => 'حصة تدريبية',
            'private' => 'استعمال خاص',
            default => $booking->booking_type,
        };

        if ($status === 'approved') {
            $message = "مرحباً {$booking->manager->name}، تم تأكيد حجزك بنجاح! ✅" . "\n"
                . "\n"
                . "• الملعب: {$booking->terrain->name}" . "\n"
                . "• النوع: {$bookingTypeLabel}" . "\n"
                . "• الفريق: {$booking->team->name}" . "\n"
                . "• التاريخ: {$booking->booking_date->format('Y-m-d')}" . "\n"
                . "• التوقيت: {$booking->start_time} - {$booking->end_time}" . "\n"
                . "\n"
                . "نتمنى لكم مباراة ممتعة! ⚽";
        } else {
            $message = "مرحباً {$booking->manager->name}، تعذر قبول طلب الحجز ❌" . "\n"
                . "\n"
                . "• الملعب: {$booking->terrain->name}" . "\n"
                . "• النوع: {$bookingTypeLabel}" . "\n"
                . "• الفريق: {$booking->team->name}" . "\n"
                . "• التاريخ: {$booking->booking_date->format('Y-m-d')}" . "\n"
                . "• التوقيت: {$booking->start_time} - {$booking->end_time}" . "\n"
                . "\n"
                . "يمكنك تجربة ملعب آخر من خلال المنصة.";
        }

        return $this->buildWaLink($managerPhone, $message);
    }

    private function formatPhone(string $phone): string
    {
        $digits = preg_replace('/[^0-9]/', '', $phone);

        if (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        if (!str_starts_with($digits, self::MOROCCO_CODE)) {
            $digits = self::MOROCCO_CODE . $digits;
        }

        return $digits;
    }

    private function buildWaLink(string $phone, string $message): string
    {
        return 'https://wa.me/' . $phone . '?text=' . rawurlencode($message);
    }
}
