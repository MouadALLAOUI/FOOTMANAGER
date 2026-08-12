<?php

namespace App\Domains\Booking\Services;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Booking\Services\Payments\PaymentProviderManager;

class PaymentIntentService
{
    public function __construct(
        private PaymentProviderManager $providers,
    ) {}

    public function create(TerrainBooking $booking): array
    {
        $provider = $this->providers->driver($booking->payment_provider ?? 'cash');
        $payment = $provider->createIntent($booking);

        return [
            'payment_required' => (bool) $booking->payment_required,
            'payment_method' => $provider->name(),
            'amount' => (float) $payment->amount,
            'currency' => $payment->currency,
            'expires_at' => $payment->expires_at?->toIso8601String(),
            'reservation_reference' => $payment->reservation_reference ?: $booking->booking_reference,
        ];
    }
}
