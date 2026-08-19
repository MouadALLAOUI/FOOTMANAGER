<?php

namespace App\Domains\Subscription\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubscriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'starts_at' => $this->starts_at?->format('Y-m-d\TH:i:s'),
            'ends_at' => $this->ends_at?->format('Y-m-d\TH:i:s'),
            'cancelled_at' => $this->cancelled_at?->format('Y-m-d\TH:i:s'),
            'price_at_start' => $this->price_at_start,
            'currency' => $this->currency,
            'billing_interval' => $this->billing_interval->value,
            'is_active' => $this->isActive(),
        ];
    }
}
