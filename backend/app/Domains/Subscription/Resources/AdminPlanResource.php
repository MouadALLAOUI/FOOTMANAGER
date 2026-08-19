<?php

namespace App\Domains\Subscription\Resources;

use App\Domains\Subscription\Models\Feature;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminPlanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'price' => $this->price,
            'currency' => $this->currency,
            'billing_interval' => $this->billing_interval?->value,
            'is_free' => $this->is_free,
            'is_active' => $this->is_active,
            'display_order' => $this->display_order,
            'badge' => $this->badge,
            'subscribers_count' => $this->whenCounted('subscriptions'),
            'discount' => $this->whenLoaded('discount', function () {
                if (! $this->discount) {
                    return null;
                }

                return [
                    'id' => $this->discount->id,
                    'type' => $this->discount->type->value,
                    'value' => $this->discount->value,
                    'starts_at' => $this->discount->starts_at?->toDateString(),
                    'ends_at' => $this->discount->ends_at?->toDateString(),
                    'is_active' => $this->discount->is_active,
                ];
            }),
            'features' => $this->whenLoaded('features', fn () => $this->features->map(
                fn (Feature $feature): array => [
                    'id' => $feature->id,
                    'key' => $feature->key,
                    'name' => $feature->name,
                    'description' => $feature->description,
                    'type' => $feature->type->value,
                    'scope' => $feature->scope->value,
                    'enabled' => (bool) $feature->pivot->enabled,
                    'value' => $feature->pivot->value,
                    'is_unlimited' => (bool) $feature->pivot->is_unlimited,
                ]
            )->values()->all()),
        ];
    }
}
