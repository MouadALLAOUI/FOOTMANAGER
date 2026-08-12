<?php

namespace App\Domains\Player\Controllers;

use App\Domains\Player\Resources\PlayerPerformanceResource;
use App\Domains\Player\Services\PlayerPerformanceService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PerformanceController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private PlayerPerformanceService $service,
    ) {}

    public function recent(Request $request): JsonResponse
    {
        $matches = $this->service->recentMatches($request->user(), $request->integer('limit', 10));

        return response()->json([
            'data' => PlayerPerformanceResource::collection($matches),
        ]);
    }

    public function heatmap(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->service->monthlyHeatmap($request->user()),
        ]);
    }

    public function positionBreakdown(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->service->positionBreakdown($request->user()),
        ]);
    }

    public function best(Request $request): JsonResponse
    {
        $matches = $this->service->bestPerformances($request->user(), $request->integer('limit', 5));

        return response()->json([
            'data' => PlayerPerformanceResource::collection($matches),
        ]);
    }

    public function form(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->service->recentMatches($request->user(), 5)->map(function ($match) {
                return [
                    'result' => $match->result,
                    'goals' => $match->goals,
                    'assists' => $match->assists,
                    'rating' => $match->rating !== null ? (float) $match->rating : null,
                    'mvp' => (bool) $match->mvp,
                    'match_date' => $match->match_date?->toDateString(),
                ];
            }),
        ]);
    }
}
