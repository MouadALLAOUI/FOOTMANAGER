<?php

namespace App\Http\Controllers\Public;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\PublicCache;
use App\Domains\Team\Queries\TeamLeaderboardQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class LeaderboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $category = $request->query('category');

        $teams = Cache::remember(
            PublicCache::teamLeaderboard((int) $request->query('page', 1), $category),
            (int) config('public.cache.team_leaderboard_ttl', 300),
            fn () => TeamLeaderboardQuery::base($category)->paginate(TeamLeaderboardQuery::PER_PAGE),
        );

        return response()->json([
            'teams' => $teams->items(),
            'current_page' => $teams->currentPage(),
            'last_page' => $teams->lastPage(),
            'per_page' => $teams->perPage(),
            'total' => $teams->total(),
        ]);
    }
}
