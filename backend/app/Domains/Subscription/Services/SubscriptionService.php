<?php

namespace App\Domains\Subscription\Services;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Subscription\Enums\BillingInterval;
use App\Domains\Subscription\Enums\FeatureType;
use App\Domains\Subscription\Enums\SubscriptionStatus;
use App\Domains\Subscription\Exceptions\PlanFeatureRequiredException;
use App\Domains\Subscription\Exceptions\PlanLimitReachedException;
use App\Domains\Subscription\Models\Plan;
use App\Domains\Subscription\Models\Subscription;
use App\Domains\Subscription\ValueObjects\SubscriptionLimitResult;
use App\Domains\Tournament\Models\Tournament;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

/**
 * Central entry point for plan/feature resolution.
 *
 * Rules:
 * - The user's current plan is the plan of their active subscription, falling
 *   back to the free plan when there is no subscription or it has expired.
 * - A plan's effective feature configuration is its own attached configuration;
 *   when a feature is not attached to the plan, it inherits the configuration of
 *   cheaper plans (higher plans include everything the lower plans grant).
 * - All plan/feature data is resolved from a single cached set of active plans,
 *   so repeated lookups inside one request never produce N+1 queries.
 */
class SubscriptionService
{
    /** Limit features whose usage can be computed from existing domain data. */
    private const USAGE_FEATURES = [
        'friendly_match_requests',
        'terrain_limit',
        'tournament_limit',
    ];

    /** Match request statuses that still consume the friendly-match quota. */
    public const ACTIVE_MATCH_REQUEST_STATUSES = ['open', 'accepted', 'live'];

    /** Tournament statuses that no longer consume the tournament quota. */
    public const TOURNAMENT_ARCHIVED_STATUSES = ['completed', 'cancelled'];

    private ?Collection $plansCache = null;

    /** All active plans ordered by display_order (cheapest first), used for pricing + inheritance. */
    public function plans(): Collection
    {
        return $this->plansCache ??= Plan::query()
            ->active()
            ->with(['features', 'discount'])
            ->orderBy('display_order')
            ->get()
            ->values();
    }

    public function getActiveSubscription(User $user): ?Subscription
    {
        $subscription = $user->activeSubscription;

        if ($subscription && $subscription->ends_at && $subscription->ends_at->isPast()) {
            return null;
        }

        return $subscription;
    }

    public function getCurrentPlan(User $user): Plan
    {
        $plan = $this->getActiveSubscription($user)?->plan ?? Plan::free();

        return $this->plans()->firstWhere('slug', $plan->slug) ?? $plan;
    }

    /**
     * Creates an active subscription for the user, snapshotting the plan's price,
     * currency and billing interval at the moment of creation. Any previously
     * active subscription is expired first, so at most one subscription is active
     * at any time. This is the single integration point a future payment provider
     * (Part 7) calls after a successful checkout.
     */
    public function subscribe(User $user, Plan $plan): Subscription
    {
        $now = now();

        $this->getActiveSubscription($user)?->update([
            'status' => SubscriptionStatus::Expired,
            'cancelled_at' => $now,
        ]);

        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'starts_at' => $now,
            'ends_at' => $plan->billing_interval === BillingInterval::Yearly
                ? $now->addYear()
                : $now->addMonth(),
            'price_at_start' => $plan->price,
            'currency' => $plan->currency,
            'billing_interval' => $plan->billing_interval,
        ]);

        $user->unsetRelation('activeSubscription');
        $user->unsetRelation('subscriptions');

        return $subscription;
    }
    /**
     * Effective feature configuration for the user's current plan.
     *
     * @return array{feature: string, name: string, type: string, scope: string, enabled: bool, value: int|null, is_unlimited: bool, plan: string}|null
     */
    public function getFeature(User $user, string $featureKey): ?array
    {
        return $this->effectiveConfig($this->getCurrentPlan($user), $featureKey);
    }

    public function hasFeature(User $user, string $featureKey): bool
    {
        return (bool) ($this->getFeature($user, $featureKey)['enabled'] ?? false);
    }

    public function getFeatureValue(User $user, string $featureKey): ?int
    {
        $config = $this->getFeature($user, $featureKey);

        if (! $config || ! $config['enabled'] || $config['is_unlimited']) {
            return null;
        }

        return $config['value'];
    }

    public function hasUnlimitedFeature(User $user, string $featureKey): bool
    {
        $config = $this->getFeature($user, $featureKey);

        return (bool) ($config['enabled'] ?? false) && (bool) ($config['is_unlimited'] ?? false);
    }

    /**
     * Granted features of the user's current plan, keyed by feature key.
     */
    public function getEffectiveFeatures(User $user): array
    {
        $plan = $this->getCurrentPlan($user);
        $result = [];

        foreach ($this->allAttachedFeatureKeys() as $featureKey) {
            $config = $this->effectiveConfig($plan, $featureKey);

            if ($config) {
                $result[$featureKey] = $config;
            }
        }

        return $result;
    }

    /**
     * Standard limit result for creating a resource: whether the user is allowed
     * given the current usage, plus the limit details and suggested upgrade plan.
     */
    public function canCreateResource(User $user, string $featureKey, int $currentUsage): SubscriptionLimitResult
    {
        $config = $this->effectiveConfig($this->getCurrentPlan($user), $featureKey);

        if (! $config || ! $config['enabled']) {
            return new SubscriptionLimitResult(
                allowed: false,
                feature: $featureKey,
                currentUsage: max($currentUsage, 0),
                limit: 0,
                unlimited: false,
                requiredPlan: $this->requiredPlanSlug($featureKey, null),
            );
        }

        if ($config['is_unlimited']) {
            return new SubscriptionLimitResult(
                allowed: true,
                feature: $featureKey,
                currentUsage: max($currentUsage, 0),
                limit: null,
                unlimited: true,
                requiredPlan: null,
            );
        }

        $limit = $config['value'];

        if ($limit === null) {
            return new SubscriptionLimitResult(
                allowed: true,
                feature: $featureKey,
                currentUsage: max($currentUsage, 0),
                limit: null,
                unlimited: false,
                requiredPlan: null,
            );
        }

        $allowed = max($currentUsage, 0) < $limit;

        return new SubscriptionLimitResult(
            allowed: $allowed,
            feature: $featureKey,
            currentUsage: max($currentUsage, 0),
            limit: $limit,
            unlimited: false,
            requiredPlan: $allowed ? null : $this->requiredPlanSlug($featureKey, $limit),
        );
    }

    /**
     * Throws when the user is not allowed to create the resource.
     * PLAN_FEATURE_REQUIRED when the feature is not granted, PLAN_LIMIT_REACHED when
     * a granted numeric limit is exhausted.
     */
    public function authorizeResource(User $user, string $featureKey, int $currentUsage): void
    {
        $result = $this->canCreateResource($user, $featureKey, $currentUsage);

        if ($result->allowed) {
            return;
        }

        if ($result->limit === 0) {
            throw new PlanFeatureRequiredException($result);
        }

        throw new PlanLimitReachedException($result);
    }

    /**
     * Throws when the user's current plan does not grant a (boolean) feature.
     * PLAN_FEATURE_REQUIRED otherwise.
     */
    public function authorizeFeature(User $user, string $featureKey): void
    {
        $this->authorizeResource($user, $featureKey, 0);
    }

    /**
     * Current usage for the known limit features, computed from domain tables.
     * Both the host and the accepted opponent consume the friendly-match quota;
     * tournaments no longer consume the quota once completed or cancelled.
     */
    public function currentUsage(User $user, string $featureKey): int
    {
        return match ($featureKey) {
            'friendly_match_requests' => $user->team
                ? MatchRequest::query()
                    ->where(function ($q) use ($user) {
                        $q->where('host_team_id', $user->team->id)
                            ->orWhere('opponent_team_id', $user->team->id);
                    })
                    ->whereIn('status', self::ACTIVE_MATCH_REQUEST_STATUSES)
                    ->count()
                : 0,
            'terrain_limit' => Stadium::query()->where('owner_id', $user->id)->count(),
            'tournament_limit' => Tournament::query()
                ->where('organizer_id', $user->id)
                ->whereNotIn('status', self::TOURNAMENT_ARCHIVED_STATUSES)
                ->count(),
            default => 0,
        };
    }

    /** Limit features the platform can compute usage for. */
    public function usageFeatures(): array
    {
        return self::USAGE_FEATURES;
    }

    /** Unique keys of every feature attached to any active plan. */
    private function allAttachedFeatureKeys(): array
    {
        $keys = [];

        foreach ($this->plans() as $plan) {
            foreach ($plan->features as $feature) {
                $keys[$feature->key] = $feature->key;
            }
        }

        return array_values($keys);
    }

    /**
     * A plan's own configuration for a feature, or null when the feature is not
     * attached to that plan.
     */
    private function ownConfig(Plan $plan, string $featureKey): ?array
    {
        $feature = $plan->features->firstWhere('key', $featureKey);

        if (! $feature) {
            return null;
        }

        $pivot = $feature->pivot;
        $isLimit = $feature->type === FeatureType::Limit;

        return [
            'feature' => $featureKey,
            'key' => $featureKey,
            'name' => $feature->name,
            'type' => $feature->type->value,
            'scope' => $feature->scope->value,
            'enabled' => (bool) $pivot->enabled,
            'value' => ($pivot->enabled && $isLimit && ! $pivot->is_unlimited) ? (int) $pivot->value : null,
            'is_unlimited' => ($pivot->enabled && $pivot->is_unlimited),
            'plan' => $plan->slug,
        ];
    }

    /**
     * Effective configuration for a plan: its own attached config wins; otherwise
     * the feature is inherited from the cheapest plan that grants it.
     */
    private function effectiveConfig(Plan $plan, string $featureKey): ?array
    {
        if ($plan->features->contains('key', $featureKey)) {
            $config = $this->ownConfig($plan, $featureKey);

            return $config && $config['enabled'] ? $config : null;
        }

        for ($i = $this->rank($plan) - 1; $i >= 0; $i--) {
            $config = $this->ownConfig($this->plans()[$i], $featureKey);

            if ($config && $config['enabled']) {
                return $config;
            }
        }

        return null;
    }

    /**
     * Slug of the cheapest plan whose own configuration grants the feature.
     * When $betterThan is given, only plans with a strictly higher limit (or
     * unlimited) qualify, i.e. plans that actually grow the allowance.
     */
    private function requiredPlanSlug(string $featureKey, ?int $betterThan): ?string
    {
        foreach ($this->plans() as $plan) {
            $config = $this->ownConfig($plan, $featureKey);

            if (! $config || ! $config['enabled']) {
                continue;
            }

            if ($config['is_unlimited']) {
                return $plan->slug;
            }

            if ($betterThan === null || $config['value'] > $betterThan) {
                return $plan->slug;
            }
        }

        return null;
    }

    /** Position of a plan in the hierarchy (0 = cheapest). */
    private function rank(Plan $plan): int
    {
        $index = $this->plans()->search(fn (Plan $candidate) => $candidate->slug === $plan->slug);

        return $index === false ? -1 : $index;
    }
}
