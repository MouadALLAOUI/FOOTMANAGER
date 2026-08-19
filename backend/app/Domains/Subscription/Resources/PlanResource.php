<?php

namespace App\Domains\Subscription\Resources;

use App\Domains\Subscription\Enums\DiscountType;
use App\Domains\Subscription\Enums\FeatureType;
use App\Domains\Subscription\Models\Feature;
use App\Domains\Subscription\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Plan payload used by both the public pricing endpoint and /me/subscription.
 *
 * By default it exposes the plan's own attached features; pass an explicit
 * effective-features payload (from SubscriptionService::getEffectiveFeatures)
 * to reflect the user's resolved configuration instead.
 */
class PlanResource extends JsonResource
{
    public function __construct(mixed $resource, private readonly ?array $effectiveFeatures = null)
    {
        parent::__construct($resource);
    }

    /**
     * @param  Plan  $request
     */
    public function toArray(Request $request): array
    {
        $features = $this->effectiveFeatures !== null
            ? array_values($this->effectiveFeatures)
            : $this->ownFeaturesPayload();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'price' => $this->price,
            'currency' => $this->currency,
            'billing_interval' => $this->billing_interval?->value,
            'is_free' => $this->is_free,
            'badge' => $this->badge,
            'display_order' => $this->display_order,
            'discount' => $this->discountPayload(),
            'final_price' => $this->finalPrice(),
            'features' => $features,
        ];
    }

    /**
     * Active discount for this plan, restricted to discounts that are enabled
     * and currently inside their date window. The backend is authoritative: the
     * frontend must never recompute discount eligibility or the final price.
     */
    private function discountPayload(): ?array
    {
        $discount = $this->resource->discount;

        if (! $discount || ! $discount->is_active) {
            return null;
        }

        $now = now();

        if ($discount->starts_at && $discount->starts_at->isFuture()) {
            return null;
        }

        if ($discount->ends_at && $discount->ends_at->isPast()) {
            return null;
        }

        return [
            'type' => $discount->type->value,
            'value' => $discount->value,
            'starts_at' => $discount->starts_at?->toDateTimeString(),
            'ends_at' => $discount->ends_at?->toDateTimeString(),
        ];
    }

    /** Price after any eligible discount; equals the base price when no discount. */
    private function finalPrice(): string
    {
        $discount = $this->discountPayload();

        if (! $discount) {
            return $this->resource->price;
        }

        $price = (float) $this->resource->price;

        $reduction = $discount['type'] === DiscountType::Percentage->value
            ? $price * ((float) $discount['value'] / 100)
            : (float) $discount['value'];

        return number_format(max(0, $price - $reduction), 2, '.', '');
    }

    /** Features as configured for this plan (own pivot rows). */
    private function ownFeaturesPayload(): array
    {
        return $this->resource->features->map(function (Feature $feature): array {
            $pivot = $feature->pivot;
            $isLimit = $feature->type === FeatureType::Limit;

            return [
                'key' => $feature->key,
                'name' => $feature->name,
                'description' => $feature->description,
                'type' => $feature->type->value,
                'scope' => $feature->scope->value,
                'enabled' => (bool) $pivot->enabled,
                'value' => ($isLimit && ! $pivot->is_unlimited) ? $pivot->value : null,
                'is_unlimited' => (bool) $pivot->is_unlimited,
            ];
        })->values()->all();
    }
}
