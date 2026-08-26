<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Shared\Base\Controller;
use App\Domains\Social\Models\Activity;
use App\Domains\Social\Services\ActivityService;
use App\Domains\Subscription\Models\Plan;
use App\Domains\Subscription\Services\SubscriptionService;
use App\Http\Requests\Admin\AssignUserSubscriptionRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserSubscriptionController extends Controller
{
    public function __construct(
        private readonly SubscriptionService $subscriptionService,
        private readonly ActivityService $activityService,
    ) {}

    public function show(int $id): JsonResponse
    {
        $user = User::where('id', $id)
            ->whereNotIn('role', ['admin', 'sub_admin'])
            ->firstOrFail();

        $subscription = $this->subscriptionService->getActiveSubscription($user);
        $plan = $this->subscriptionService->getCurrentPlan($user);
        $features = $this->subscriptionService->getEffectiveFeatures($user);

        $usage = [];
        foreach ($this->subscriptionService->usageFeatures() as $featureKey) {
            $usage[] = $this->subscriptionService
                ->canCreateResource(
                    $user,
                    $featureKey,
                    $this->subscriptionService->currentUsage($user, $featureKey),
                )
                ->toArray();
        }

        $history = $user->subscriptions()
            ->with('plan:id,name,slug,price,currency,billing_interval,is_free')
            ->orderByDesc('id')
            ->limit(20)
            ->get()
            ->map(fn ($sub) => [
                'id' => $sub->id,
                'status' => $sub->status->value,
                'starts_at' => $sub->starts_at?->format('Y-m-d\TH:i:s'),
                'ends_at' => $sub->ends_at?->format('Y-m-d\TH:i:s'),
                'cancelled_at' => $sub->cancelled_at?->format('Y-m-d\TH:i:s'),
                'price_at_start' => $sub->price_at_start,
                'currency' => $sub->currency,
                'billing_interval' => $sub->billing_interval->value,
                'plan' => [
                    'id' => $sub->plan->id,
                    'name' => $sub->plan->name,
                    'slug' => $sub->plan->slug,
                ],
            ]);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->role,
            ],
            'subscription' => $subscription ? [
                'id' => $subscription->id,
                'status' => $subscription->status->value,
                'starts_at' => $subscription->starts_at?->format('Y-m-d\TH:i:s'),
                'ends_at' => $subscription->ends_at?->format('Y-m-d\TH:i:s'),
                'price_at_start' => $subscription->price_at_start,
                'currency' => $subscription->currency,
                'billing_interval' => $subscription->billing_interval->value,
            ] : null,
            'plan' => [
                'id' => $plan->id,
                'name' => $plan->name,
                'slug' => $plan->slug,
                'is_free' => $plan->is_free,
                'features' => array_values($features),
            ],
            'usage' => $usage,
            'history' => $history,
        ]);
    }

    public function update(AssignUserSubscriptionRequest $request, int $id): JsonResponse
    {
        $user = User::where('id', $id)
            ->whereNotIn('role', ['admin', 'sub_admin'])
            ->firstOrFail();

        $plan = Plan::findOrFail($request->validated('plan_id'));

        if (! $plan->is_active) {
            return response()->json([
                'message' => 'لا يمكن تعيين خطة غير نشطة.',
            ], 422);
        }

        $previousPlan = $this->subscriptionService->getCurrentPlan($user);
        $this->subscriptionService->subscribe($user, $plan);

        $activityType = $previousPlan->id === $plan->id
            ? Activity::TYPE_PLAN_ASSIGNED
            : Activity::TYPE_PLAN_CHANGED;

        $this->activityService->record(
            $activityType,
            $request->user(),
            $user,
            [
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
                'plan_slug' => $plan->slug,
                'previous_plan_id' => $previousPlan->id,
                'previous_plan_name' => $previousPlan->name,
                'previous_plan_slug' => $previousPlan->slug,
            ],
        );

        $freshPlan = $this->subscriptionService->getCurrentPlan($user);
        $subscription = $this->subscriptionService->getActiveSubscription($user);

        return response()->json([
            'message' => 'تم تعيين الخطة بنجاح.',
            'plan' => [
                'id' => $freshPlan->id,
                'name' => $freshPlan->name,
                'slug' => $freshPlan->slug,
                'is_free' => $freshPlan->is_free,
            ],
            'subscription' => $subscription ? [
                'id' => $subscription->id,
                'status' => $subscription->status->value,
                'starts_at' => $subscription->starts_at?->format('Y-m-d\TH:i:s'),
                'ends_at' => $subscription->ends_at?->format('Y-m-d\TH:i:s'),
            ] : null,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = User::where('id', $id)
            ->whereNotIn('role', ['admin', 'sub_admin'])
            ->firstOrFail();

        $subscription = $this->subscriptionService->getActiveSubscription($user);

        if (! $subscription) {
            return response()->json([
                'message' => 'المستخدم ليس لديه اشتراك نشط.',
            ], 404);
        }

        $planName = $subscription->plan->name;
        $planSlug = $subscription->plan->slug;

        $subscription->update(['status' => 'cancelled', 'cancelled_at' => now()]);
        $user->unsetRelation('activeSubscription');

        $freePlan = Plan::free();

        $this->activityService->record(
            Activity::TYPE_PLAN_REMOVED,
            $request->user(),
            $user,
            [
                'cancelled_plan_name' => $planName,
                'cancelled_plan_slug' => $planSlug,
                'fallback_plan_id' => $freePlan?->id,
                'fallback_plan_name' => $freePlan?->name,
                'fallback_plan_slug' => $freePlan?->slug,
            ],
        );

        $freshPlan = $this->subscriptionService->getCurrentPlan($user);

        return response()->json([
            'message' => 'تم إلغاء اشتراك المستخدم بنجاح.',
            'plan' => [
                'id' => $freshPlan->id,
                'name' => $freshPlan->name,
                'slug' => $freshPlan->slug,
                'is_free' => $freshPlan->is_free,
            ],
        ]);
    }
}
