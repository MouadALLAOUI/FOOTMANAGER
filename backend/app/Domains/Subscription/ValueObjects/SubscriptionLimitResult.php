<?php

namespace App\Domains\Subscription\ValueObjects;

/**
 * Standard result of a plan limit check.
 *
 * - allowed:      whether the resource can be created given the current usage.
 * - feature:      the machine-readable feature key being checked.
 * - current_usage: how much of the limit is already consumed.
 * - limit:        the configured numeric limit (null when unlimited).
 * - unlimited:    whether the plan grants this feature without a numeric limit.
 * - required_plan: slug of the cheapest plan that unlocks/grows the feature
 *                  (null when the current plan already has the best config).
 */
final class SubscriptionLimitResult
{
    public function __construct(
        public readonly bool $allowed,
        public readonly string $feature,
        public readonly int $currentUsage,
        public readonly ?int $limit,
        public readonly bool $unlimited,
        public readonly ?string $requiredPlan,
    ) {
    }

    public function toArray(): array
    {
        return [
            'allowed' => $this->allowed,
            'feature' => $this->feature,
            'current_usage' => $this->currentUsage,
            'limit' => $this->limit,
            'unlimited' => $this->unlimited,
            'required_plan' => $this->requiredPlan,
        ];
    }
}
