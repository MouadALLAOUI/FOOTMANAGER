<?php

namespace App\Http\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\PublicCache;
use App\Domains\Stadium\Models\Stadium;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class StadiumController extends Controller
{
    public function index(): JsonResponse
    {
        $stadiums = Cache::remember(
            PublicCache::stadiums(),
            (int) config('public.cache.terrains_ttl', 300),
            fn () => Stadium::with('owner:id,name')
                ->select('id', 'name', 'city', 'address', 'capacity', 'owner_id', 'type', 'player_format', 'has_benches', 'supports_tournaments', 'has_lighting', 'has_vestiaires', 'price_per_team', 'total_price', 'is_available')
                ->where('is_available', true)
                ->where('is_open', true)
                ->orderBy('name')
                ->get(),
        );

        return response()->json(['stadiums' => $stadiums]);
    }

    public function publicTerrains(Request $request): JsonResponse
    {
        $type = $request->query('type');
        $city = $request->query('city');
        $playerFormat = $request->query('player_format');

        $terrains = Cache::remember(
            PublicCache::terrains($type, $city, $playerFormat),
            (int) config('public.cache.terrains_ttl', 300),
            function () use ($type, $city, $playerFormat) {
                $query = Stadium::with(['owner:id,name', 'images'])
                    ->where('is_available', true)
                    ->where('is_open', true)
                    ->whereHas('owner', fn ($q) => $q->where('status', 'approved'))
                    ->latest();

                if ($type !== null && $type !== '') {
                    $query->where('type', $type);
                }

                if ($city !== null && $city !== '') {
                    $query->where('city', $city);
                }

                if ($playerFormat !== null && $playerFormat !== '') {
                    $query->where('player_format', $playerFormat);
                }

                return $query->get([
                    'id', 'name', 'city', 'address', 'owner_id', 'type', 'player_format',
                    'has_benches', 'supports_tournaments', 'has_lighting', 'has_vestiaires',
                    'price_per_team', 'total_price', 'is_available', 'google_maps_url',
                ]);
            },
        );

        return response()->json(['terrains' => $terrains]);
    }
}
