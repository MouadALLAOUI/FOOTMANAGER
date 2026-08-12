<?php

namespace App\Domains\Shared\Contracts;

use App\Domains\Booking\Models\Payment;
use App\Domains\Booking\Models\TerrainBooking;

interface PaymentProvider
{
    public function name(): string;

    public function createIntent(TerrainBooking $booking): Payment;

    public function handleWebhook(array $payload): Payment;
}
