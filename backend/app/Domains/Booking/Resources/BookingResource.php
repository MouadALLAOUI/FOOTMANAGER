<?php

namespace App\Domains\Booking\Resources;

use App\Domains\Booking\Services\ReceiptService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $duration = null;
        if ($this->start_time && $this->end_time) {
            $duration = now()->parse($this->start_time)
                ->diffInMinutes(now()->parse($this->end_time));
        }

        return [
            'booking_id' => $this->id,
            'id' => $this->id,
            'booking_reference' => $this->booking_reference,
            'uuid' => $this->uuid,
            'status' => $this->status,
            'reservation_status' => $this->status,
            'booking_type' => $this->booking_type,
            'flow_type' => $this->flow_type,
            'reservation_type' => $this->reservation_type,
            'booking_date' => $this->booking_date?->format('Y-m-d'),
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'duration_minutes' => $duration,
            'price' => $this->price !== null ? (float) $this->price : null,
            'subtotal' => $this->subtotal !== null ? (float) $this->subtotal : null,
            'service_fee' => $this->service_fee !== null ? (float) $this->service_fee : null,
            'total' => $this->total !== null ? (float) $this->total : null,
            'payment_required' => (bool) $this->payment_required,
            'payment_status' => $this->payment_status,
            'payment_method' => $this->payment_method,
            'expires_at' => $this->expires_at?->toIso8601String(),
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'cancellation_reason' => $this->cancellation_reason,
            'refund_percentage' => $this->refund_percentage !== null ? (float) $this->refund_percentage : null,
            'refund_amount' => $this->refund_amount !== null ? (float) $this->refund_amount : null,
            'stadium' => [
                'id' => $this->terrain?->id,
                'name' => $this->terrain?->name,
                'slug' => $this->terrain?->slug,
                'type' => $this->terrain?->type,
                'city' => $this->terrain?->city,
                'address' => $this->terrain?->address,
            ],
            'owner' => [
                'id' => $this->terrain?->owner?->id,
                'name' => $this->terrain?->owner?->name,
                'phone' => $this->terrain?->owner?->phone,
            ],
            'team' => [
                'id' => $this->team?->id,
                'name' => $this->team?->name,
            ],
            'cancellation_policy' => [
                'id' => $this->cancellationPolicy?->id,
                'name' => $this->cancellationPolicy?->name,
                'slug' => $this->cancellationPolicy?->slug,
                'hours_before' => $this->cancellationPolicy?->hours_before,
                'refund_percentage' => $this->cancellationPolicy?->refund_percentage,
            ],
            'qr_code_url' => $this->qr_code_path
                ? app(ReceiptService::class)->qrUrl($this->resource)
                : null,
            'receipt_url' => $this->receipt_path
                ? app(ReceiptService::class)->receiptUrl($this->resource)
                : null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
