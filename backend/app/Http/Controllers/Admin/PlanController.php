<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Shared\Base\Controller;
use App\Domains\Subscription\Models\Feature;
use App\Domains\Subscription\Models\Plan;
use App\Domains\Subscription\Models\PlanFeature;
use App\Domains\Subscription\Resources\AdminPlanResource;
use App\Http\Requests\Admin\ReorderPlansRequest;
use App\Http\Requests\Admin\StorePlanRequest;
use App\Http\Requests\Admin\SyncPlanFeaturesRequest;
use App\Http\Requests\Admin\UpdatePlanDiscountRequest;
use App\Http\Requests\Admin\UpdatePlanRequest;
use App\Http\Requests\Admin\UpdatePlanStatusRequest;
use Illuminate\Http\JsonResponse;

class PlanController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = Plan::query()
            ->with(['features', 'discount'])
            ->withCount('subscriptions')
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();

        $features = Feature::query()->orderBy('name')->get();

        return response()->json([
            'plans' => AdminPlanResource::collection($plans),
            'features' => $features,
        ]);
    }

    public function store(StorePlanRequest $request): JsonResponse
    {
        $plan = Plan::create($request->validated());
        $plan->load(['features', 'discount'])->loadCount('subscriptions');

        return response()->json([
            'message' => 'تم إنشاء الخطة بنجاح.',
            'plan' => new AdminPlanResource($plan),
        ], 201);
    }

    public function show(Plan $plan): JsonResponse
    {
        $plan->load(['features', 'discount'])->loadCount('subscriptions');

        return response()->json([
            'plan' => new AdminPlanResource($plan),
        ]);
    }

    public function update(UpdatePlanRequest $request, Plan $plan): JsonResponse
    {
        $plan->update($request->validated());
        $plan->load(['features', 'discount'])->loadCount('subscriptions');

        return response()->json([
            'message' => 'تم تحديث الخطة بنجاح.',
            'plan' => new AdminPlanResource($plan),
        ]);
    }

    public function updateStatus(UpdatePlanStatusRequest $request, Plan $plan): JsonResponse
    {
        $isActive = (bool) $request->validated('is_active');

        $plan->update(['is_active' => $isActive]);

        return response()->json([
            'message' => $isActive ? 'تم تفعيل الخطة بنجاح.' : 'تم إيقاف الخطة بنجاح.',
            'plan' => new AdminPlanResource($plan->load(['features', 'discount'])->loadCount('subscriptions')),
        ]);
    }

    public function syncFeatures(SyncPlanFeaturesRequest $request, Plan $plan): JsonResponse
    {
        $submittedIds = collect($request->validated('features'))
            ->pluck('feature_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        PlanFeature::query()
            ->where('plan_id', $plan->id)
            ->whereNotIn('feature_id', $submittedIds)
            ->delete();

        foreach ($request->validated('features') as $row) {
            $enabled = (bool) $row['enabled'];
            $unlimited = (bool) $row['is_unlimited'];

            PlanFeature::updateOrCreate(
                ['plan_id' => $plan->id, 'feature_id' => (int) $row['feature_id']],
                [
                    'enabled' => $enabled,
                    'value' => ($enabled && ! $unlimited) ? $row['value'] : null,
                    'is_unlimited' => $unlimited,
                ]
            );
        }

        $plan->load(['features', 'discount'])->loadCount('subscriptions');

        return response()->json([
            'message' => 'تم تحديث مزايا الخطة بنجاح.',
            'plan' => new AdminPlanResource($plan),
        ]);
    }

    public function updateDiscount(UpdatePlanDiscountRequest $request, Plan $plan): JsonResponse
    {
        $data = $request->validated();

        $plan->discount()->updateOrCreate([], [
            'type' => $data['type'],
            'value' => $data['value'],
            'starts_at' => $data['starts_at'] ?? null,
            'ends_at' => $data['ends_at'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);

        $plan->load(['features', 'discount'])->loadCount('subscriptions');

        return response()->json([
            'message' => 'تم تحديث الخصم بنجاح.',
            'plan' => new AdminPlanResource($plan),
        ]);
    }

    public function reorder(ReorderPlansRequest $request): JsonResponse
    {
        foreach (array_values($request->validated('order')) as $index => $planId) {
            Plan::whereKey($planId)->update(['display_order' => $index + 1]);
        }

        return response()->json([
            'message' => 'تم تحديث ترتيب الخطط بنجاح.',
        ]);
    }

    public function destroy(Plan $plan): JsonResponse
    {
        if ($plan->subscriptions()->exists()) {
            return response()->json([
                'message' => 'لا يمكن حذف خطة مرتبطة باشتراكات حالية أو سابقة.',
            ], 409);
        }

        $plan->delete();

        return response()->json([
            'message' => 'تم حذف الخطة بنجاح.',
        ]);
    }
}
