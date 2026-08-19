<?php

namespace App\Domains\Subscription\Exceptions;

use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Subscription\ValueObjects\SubscriptionLimitResult;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Raised when a plan limit is exceeded: the feature is granted but the
 * current usage has reached (or passed) the configured limit.
 */
class PlanLimitReachedException extends DomainException
{
    public function __construct(private readonly SubscriptionLimitResult $result)
    {
        parent::__construct('لقد بلغت الحد المسموح به في خطتك الحالية', 403);
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json(
            [
                'error' => 'PLAN_LIMIT_REACHED',
                'message' => $this->getMessage(),
            ] + $this->result->toArray(),
            403
        );
    }
}
