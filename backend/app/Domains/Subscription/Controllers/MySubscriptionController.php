<?php

namespace App\Domains\Subscription\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Subscription\Resources\PlanResource;
use App\Domains\Subscription\Resources\SubscriptionResource;
use App\Domains\Subscription\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Authenticated endpoint exposing the caller's current subscription, their
 * effective plan/features, and live usage per limit feature.
 */
class MySubscriptionController extends Controller
{
    public function __construct(private readonly SubscriptionService $subscriptionService)
    {
    }

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        $subscription = $this->subscriptionService->getActiveSubscription($user);
        $plan = $this->subscriptionService->getCurrentPlan($user);

        $usage = [];

        foreach ($this->subscriptionService->usageFeatures() as $featureKey) {
            $usage[] = $this->subscriptionService
                ->canCreateResource(
                    $user,
                    $featureKey,
                    $this->subscriptionService->currentUsage($user, $featureKey)
                )
                ->toArray();
        }

        return response()->json([
            'subscription' => $subscription ? new SubscriptionResource($subscription) : null,
            'plan' => new PlanResource($plan, $this->subscriptionService->getEffectiveFeatures($user)),
            'usage' => $usage,
        ]);
    }
}
