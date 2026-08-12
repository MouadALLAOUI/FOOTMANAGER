<?php

namespace App\Domains\Booking\Resources;

use App\Domains\Booking\Services\ReceiptService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReceiptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $service = app(ReceiptService::class);

        return [
            'booking_id' => $this->id,
            'booking_reference' => $this->booking_reference,
            'receipt_url' => $service->receiptUrl($this->resource),
            'qr_code_url' => $service->qrUrl($this->resource),
            'content_type' => 'application/pdf',
            'generated_at' => now()->toIso8601String(),
        ];
    }
}
