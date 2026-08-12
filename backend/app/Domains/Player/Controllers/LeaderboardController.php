<?php

namespace App\Domains\Player\Controllers;

use App\Domains\Player\Services\PlayerLeaderboardService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaderboardController extends Controller
{
    public function __construct(
        private PlayerLeaderboardService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = [
            'position' => $request->input('position', 'all'),
            'city' => $request->input('city', 'all'),
        ];

        $data = $this->service->index($filters, $request->integer('limit', 50));

        return response()->json([
            'data' => $data['entries'],
            'meta' => [
                'total' => $data['total'],
                'my_rank' => $this->service->rankOf($request->user()?->id ?? 0),
            ],
        ]);
    }
}
