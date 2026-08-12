<?php

namespace App\Domains\Booking\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentIntentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'payment_required' => (bool) $this['payment_required'],
            'payment_method' => $this['payment_method'],
            'amount' => (float) $this['amount'],
            'currency' => $this['currency'],
            'expires_at' => $this['expires_at'],
            'reservation_reference' => $this['reservation_reference'],
        ];
    }
}
