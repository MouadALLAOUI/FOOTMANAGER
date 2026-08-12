<?php

namespace App\Http\Controllers\Public;

use App\Domains\Player\Models\PlayerProfile;
use App\Domains\Player\Resources\PlayerLeaderboardResource;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\PublicCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PlayerLeaderboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $position = $request->query('position');
        $city = $request->query('city');

        $leaderboard = Cache::remember(
            PublicCache::playerLeaderboard((int) $request->query('page', 1), $position, $city),
            (int) config('public.cache.player_leaderboard_ttl', 300),
            function () use ($position, $city) {
                $query = PlayerProfile::with('user')
                    ->whereHas('user', function ($q) {
                        $q->where('role', 'player')->where('status', 'approved');
                    });

                if ($position !== null && $position !== '') {
                    $query->where('position', $position);
                }

                if ($city !== null && $city !== '') {
                    $query->where('city', $city);
                }

                return $query
                    ->orderByDesc('points')
                    ->orderByDesc('wins')
                    ->orderByDesc('rating')
                    ->paginate(20);
            }
        );

        $ranked = collect($leaderboard->items())->map(function ($player, $index) use ($leaderboard) {
            return [
                'profile' => $player,
                'rank' => $leaderboard->firstItem() + $index,
            ];
        });

        return response()->json([
            'players' => PlayerLeaderboardResource::collection($ranked)->resolve($request),
            'current_page' => $leaderboard->currentPage(),
            'last_page' => $leaderboard->lastPage(),
            'per_page' => $leaderboard->perPage(),
            'total' => $leaderboard->total(),
        ]);
    }
}
