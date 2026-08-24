<?php

namespace App\Domains\Team\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\CurrentTeamResolver;
use App\Domains\Subscription\Services\SubscriptionService;
use App\Domains\Team\Resources\TeamStatisticsResource;
use App\Domains\Team\Services\TeamStatisticsService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamStatisticsController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private CurrentTeamResolver $resolver,
        private TeamStatisticsService $service,
        private SubscriptionService $subscription,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->isAdmin()) {
            $this->subscription->authorizeFeature($user, 'advanced_statistics');
        }

        $team = $this->resolver->for($user);

        $this->authorize('viewStatistics', $team);

        $from = $request->query('from');
        $to = $request->query('to');
        $groupBy = in_array($request->query('group_by'), ['hour', 'day'], true) ? $request->query('group_by') : null;

        // If no range filter, keep legacy behaviour (cached all-time stats)
        if (! $from && ! $to && ! $groupBy) {
            return response()->json([
                'data' => new TeamStatisticsResource($this->service->for($team)),
            ]);
        }

        return response()->json([
            'data' => new TeamStatisticsResource($this->service->for($team, $from, $to, $groupBy)),
        ]);
    }
}
