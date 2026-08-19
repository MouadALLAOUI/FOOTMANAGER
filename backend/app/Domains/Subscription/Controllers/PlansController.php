<?php

namespace App\Domains\Subscription\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Subscription\Models\Plan;
use App\Domains\Subscription\Resources\PlanResource;
use App\Domains\Subscription\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;

/**
 * Public pricing endpoint: lists all active plans with their own features.
 */
class PlansController extends Controller
{
    public function __construct(private readonly SubscriptionService $subscriptionService)
    {
    }

    public function index(): JsonResponse
    {
        $plans = $this->subscriptionService->plans();

        return response()->json([
            'plans' => $plans->map(fn (Plan $plan) => new PlanResource($plan))->all(),
        ]);
    }
}
