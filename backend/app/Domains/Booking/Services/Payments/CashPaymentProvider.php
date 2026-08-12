<?php

namespace App\Domains\Booking\Services\Payments;

use App\Domains\Booking\Models\Payment;
use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Shared\Contracts\PaymentProvider;

class CashPaymentProvider implements PaymentProvider
{
    public function name(): string
    {
        return 'cash';
    }

    public function createIntent(TerrainBooking $booking): Payment
    {
        return Payment::updateOrCreate(
            ['booking_id' => $booking->id, 'provider' => $this->name()],
            [
                'reservation_reference' => $booking->booking_reference,
                'provider' => $this->name(),
                'amount' => $booking->total ?? $booking->price ?? 0,
                'currency' => 'MAD',
                'status' => 'initiated',
                'expires_at' => now()->addMinutes(30),
            ]
        );
    }

    public function handleWebhook(array $payload): Payment
    {
        throw new \BadMethodCallException('Cash payments do not receive webhooks yet.');
    }
}
