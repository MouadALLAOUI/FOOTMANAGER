<?php

namespace App\Domains\Team\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\CurrentTeamResolver;
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
    ) {}

    public function index(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('viewStatistics', $team);

        return response()->json([
            'data' => new TeamStatisticsResource($this->service->for($team)),
        ]);
    }
}
