<?php

namespace App\Domains\Leaderboard\Controllers;

use App\Domains\Leaderboard\Queries\LeaderboardQuery;
use App\Domains\Leaderboard\Resources\LeaderboardResource;
use App\Domains\Shared\Base\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaderboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = LeaderboardQuery::applyFilters(LeaderboardQuery::base(), $request);

        $perPage = min(max((int) $request->query('per_page', 20), 1), 100);
        $teams = $query->paginate($perPage)->withQueryString();

        $offset = $teams->firstItem() ? $teams->firstItem() - 1 : 0;

        $data = $teams->getCollection()
            ->values()
            ->map(function ($team, $index) use ($request, $offset) {
                $row = (new LeaderboardResource($team))->resolve($request);
                $row['rank'] = $offset + $index + 1;

                return $row;
            })
            ->all();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $teams->currentPage(),
                'last_page' => $teams->lastPage(),
                'per_page' => $teams->perPage(),
                'total' => $teams->total(),
            ],
        ]);
    }
}
