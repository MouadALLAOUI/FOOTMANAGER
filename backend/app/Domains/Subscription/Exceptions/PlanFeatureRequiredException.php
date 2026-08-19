<?php

namespace App\Domains\Subscription\Exceptions;

use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Subscription\ValueObjects\SubscriptionLimitResult;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Raised when a feature is not granted at all by the user's effective plan
 * (either it is not configured, or it is configured with limit 0).
 */
class PlanFeatureRequiredException extends DomainException
{
    public function __construct(private readonly SubscriptionLimitResult $result)
    {
        parent::__construct('هذه الميزة غير متوفرة في خطتك الحالية، قم بالترقية للاستفادة منها', 403);
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json(
            [
                'error' => 'PLAN_FEATURE_REQUIRED',
                'message' => $this->getMessage(),
            ] + $this->result->toArray(),
            403
        );
    }
}
