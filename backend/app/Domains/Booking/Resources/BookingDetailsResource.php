<?php

namespace App\Domains\Booking\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingDetailsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            ...(new BookingResource($this->resource))->toArray($request),
            'notes' => $this->notes,
            'payments' => $this->whenLoaded('payments', fn () => $this->payments->map(
                fn ($payment) => [
                    'id' => $payment->id,
                    'provider' => $payment->provider,
                    'provider_reference' => $payment->provider_reference,
                    'reservation_reference' => $payment->reservation_reference,
                    'amount' => (float) $payment->amount,
                    'currency' => $payment->currency,
                    'status' => $payment->status,
                    'payment_method' => $payment->payment_method,
                    'expires_at' => $payment->expires_at?->toIso8601String(),
                    'paid_at' => $payment->paid_at?->toIso8601String(),
                ],
            )),
        ];
    }
}
