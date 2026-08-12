<?php

namespace App\Domains\Player\Controllers;

use App\Domains\Player\Models\PlayerMatchStat;
use App\Domains\Player\Resources\PlayerMatchRatingResource;
use App\Domains\Player\Resources\PlayerStatisticsResource;
use App\Domains\Player\Services\PlayerStatisticsService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StatisticsController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private PlayerStatisticsService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $stats = $this->service->for($request->user()->id);

        return response()->json([
            'data' => new PlayerStatisticsResource($stats),
        ]);
    }

    public function sync(Request $request): JsonResponse
    {
        $stats = $this->service->syncForUser($request->user()->id);

        return response()->json([
            'data' => new PlayerStatisticsResource($stats),
        ]);
    }

    public function ratings(Request $request): JsonResponse
    {
        $ratings = PlayerMatchStat::query()
            ->where('user_id', $request->user()->id)
            ->whereNotNull('rating')
            ->orderByDesc('match_date')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'data' => PlayerMatchRatingResource::collection($ratings),
            'meta' => [
                'current_page' => $ratings->currentPage(),
                'last_page' => $ratings->lastPage(),
                'total' => $ratings->total(),
            ],
        ]);
    }
}
