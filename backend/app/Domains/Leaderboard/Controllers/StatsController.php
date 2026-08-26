<?php

namespace App\Domains\Leaderboard\Controllers;

use App\Domains\Leaderboard\Resources\StatsResource;
use App\Domains\Leaderboard\Services\CommunityStatsService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Http\JsonResponse;

class StatsController extends Controller
{
    public function __construct(private CommunityStatsService $statsService) {}

    public function index(): JsonResponse
    {
        return response()->json(new StatsResource($this->statsService->stats()));
    }
}
