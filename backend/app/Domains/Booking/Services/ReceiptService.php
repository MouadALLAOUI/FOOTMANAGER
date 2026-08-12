<?php

namespace App\Domains\Booking\Services;

use App\Domains\Booking\Models\TerrainBooking;
use BaconQrCode\Renderer\GDLibRenderer;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\Storage;
use Mpdf\Mpdf;
use Mpdf\Output\Destination;

class ReceiptService
{
    private const STATUS_LABELS = [
        'pending' => 'قيد الانتظار',
        'confirmed' => 'مؤكد',
        'approved' => 'تمت الموافقة',
        'completed' => 'منجز',
        'cancelled' => 'ملغى',
        'rejected' => 'مرفوض',
        'expired' => 'منتهي الصلاحية',
    ];

    private const PAYMENT_LABELS = [
        'unpaid' => 'غير مدفوع',
        'pending' => 'قيد الدفع',
        'paid' => 'مدفوع',
        'refunded' => 'مسترد',
        'failed' => 'فشل الدفع',
    ];

    private const BOOKING_TYPE_LABELS = [
        'match' => 'مباراة',
        'training' => 'حصة تدريبية',
        'private' => 'حجز خاص',
    ];

    public function generate(TerrainBooking $booking): string
    {
        $booking->loadMissing(['terrain.owner', 'team', 'cancellationPolicy']);

        $this->generateQr($booking);

        $tempDir = storage_path('app/mpdf');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0777, true);
        }

        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => 'A5',
            'default_font' => 'dejavusans',
            'margin_top' => 10,
            'margin_bottom' => 10,
            'margin_left' => 10,
            'margin_right' => 10,
            'autoScriptToLang' => true,
            'autoLangToFont' => true,
            'tempDir' => $tempDir,
        ]);

        $mpdf->WriteHTML($this->buildHtml($booking));

        $disk = Storage::disk('public');
        $disk->makeDirectory('receipts');
        $fileName = 'receipt-'.$this->reference($booking).'.pdf';
        $path = $disk->path('receipts/'.$fileName);

        $mpdf->Output($path, Destination::FILE);

        $booking->update(['receipt_path' => 'receipts/'.$fileName]);

        return $path;
    }

    public function qrUrl(TerrainBooking $booking): ?string
    {
        return $booking->qr_code_path
            ? Storage::disk('public')->url($booking->qr_code_path)
            : null;
    }

    public function receiptUrl(TerrainBooking $booking): ?string
    {
        return $booking->receipt_path
            ? Storage::disk('public')->url($booking->receipt_path)
            : null;
    }

    private function generateQr(TerrainBooking $booking): void
    {
        $disk = Storage::disk('public');
        $disk->makeDirectory('qr');
        $fileName = 'booking-'.$this->reference($booking).'.png';

        $content = json_encode([
            'type' => 'booking',
            'booking_id' => $booking->id,
            'reference' => $booking->booking_reference,
            'uuid' => $booking->uuid,
        ]);

        $writer = new Writer(new GDLibRenderer(260, 4, 'png'));
        $disk->put('qr/'.$fileName, $writer->writeString($content));

        $booking->update(['qr_code_path' => 'qr/'.$fileName]);
    }

    private function reference(TerrainBooking $booking): string
    {
        return $booking->booking_reference ?: ($booking->uuid ?: 'legacy-'.$booking->id);
    }

    private function buildHtml(TerrainBooking $booking): string
    {
        $terrain = $booking->terrain;
        $qrPath = $booking->qr_code_path
            ? Storage::disk('public')->path($booking->qr_code_path)
            : null;

        $duration = null;
        if ($booking->start_time && $booking->end_time) {
            $duration = now()->parse($booking->start_time)->diffInMinutes(now()->parse($booking->end_time));
        }

        $statusLabel = self::STATUS_LABELS[$booking->status] ?? $booking->status;
        $paymentLabel = self::PAYMENT_LABELS[$booking->payment_status] ?? $booking->payment_status;
        $bookingTypeLabel = self::BOOKING_TYPE_LABELS[$booking->booking_type] ?? $booking->booking_type;

        $total = $booking->total ?? $booking->price ?? 0;
        $subtotal = $booking->subtotal ?? $booking->price ?? 0;
        $serviceFee = $booking->service_fee ?? 0;

        $ref = e((string) $booking->booking_reference);
        $terrainName = e((string) $terrain?->name);
        $terrainCity = e((string) $terrain?->city);
        $terrainAddress = e((string) $terrain?->address);
        $bookingDate = e($booking->booking_date?->format('Y-m-d'));
        $timeSlot = e($booking->start_time.' - '.$booking->end_time);
        $teamName = e((string) $booking->team?->name);
        $generatedAt = e(now()->format('Y-m-d H:i'));

        $rows = [
            'مرجع الحجز' => $ref,
            'الملعب' => $terrainName,
            'المدينة' => $terrainCity,
            'العنوان' => $terrainAddress,
            'نوع الحجز' => $bookingTypeLabel,
            'التاريخ' => $bookingDate,
            'التوقيت' => $timeSlot,
            'المدة (بالدقائق)' => (string) $duration,
            'الفريق' => $teamName,
            'الحالة' => $statusLabel,
            'حالة الدفع' => $paymentLabel,
        ];

        $infoRows = '';
        foreach ($rows as $label => $value) {
            $infoRows .= "<tr>
                <td style=\"background-color:#f1f5f9;font-weight:bold;width:38%;\">{$label}</td>
                <td style=\"background-color:#ffffff;\">{$value}</td>
            </tr>";
        }

        $subtotalLabel = e(number_format((float) $subtotal, 2));
        $feeLabel = e(number_format((float) $serviceFee, 2));
        $totalLabel = e(number_format((float) $total, 2));

        $refundRow = '';
        if ($booking->status === 'cancelled') {
            $refundPercentLabel = e((string) $booking->refund_percentage);
            $refundAmountLabel = e(number_format((float) $booking->refund_amount, 2));
            $refundRow = "<tr>
                <td style=\"background-color:#f1f5f9;font-weight:bold;\">نسبة الاسترداد</td>
                <td style=\"background-color:#ffffff;\">{$refundPercentLabel}%</td>
            </tr>
            <tr>
                <td style=\"background-color:#f1f5f9;font-weight:bold;\">مبلغ الاسترداد</td>
                <td style=\"background-color:#ffffff;\">{$refundAmountLabel} درهم</td>
            </tr>";
        }

        $qrHtml = $qrPath
            ? "<img src=\"{$qrPath}\" style=\"width:100px;height:100px;\" />"
            : '';

        return <<<HTML
        <div dir="rtl" style="font-family:dejavusans;color:#0f172a;">
            <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
                <tr>
                    <td style="text-align:right;font-size:20px;font-weight:bold;color:#166534;">إيصال حجز</td>
                    <td style="text-align:left;font-size:10px;color:#64748b;">FootMANAGER<br />ملاعب + مباريات ودية</td>
                </tr>
            </table>

            <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
                {$infoRows}
            </table>

            <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
                <tr>
                    <td style="background-color:#f1f5f9;font-weight:bold;width:38%;">المبلغ الفرعي</td>
                    <td style="background-color:#ffffff;">{$subtotalLabel} درهم</td>
                </tr>
                <tr>
                    <td style="background-color:#f1f5f9;font-weight:bold;">رسوم الخدمة</td>
                    <td style="background-color:#ffffff;">{$feeLabel} درهم</td>
                </tr>
                <tr>
                    <td style="background-color:#f1f5f9;font-weight:bold;font-size:14px;">الإجمالي</td>
                    <td style="background-color:#ffffff;font-size:14px;font-weight:bold;color:#166534;">{$totalLabel} درهم</td>
                </tr>
                {$refundRow}
            </table>

            <table style="width:100%;">
                <tr>
                    <td style="text-align:center;">{$qrHtml}</td>
                </tr>
            </table>

            <p style="font-size:9px;color:#64748b;text-align:center;margin-top:8px;">
                صدر هذا الإيصال في {$generatedAt} — FootMANAGER
            </p>
        </div>
        HTML;
    }
}
