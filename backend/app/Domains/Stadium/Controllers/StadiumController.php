<?php

namespace App\Domains\Stadium\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Stadium\Queries\StadiumQuery;
use App\Domains\Stadium\Resources\StadiumDetailsResource;
use App\Domains\Stadium\Resources\StadiumResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StadiumController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = StadiumQuery::applyFilters(StadiumQuery::base(), $request);

        $perPage = min(max((int) $request->query('per_page', 20), 1), 50);
        $stadiums = $query->paginate($perPage)->withQueryString();

        $data = $stadiums->getCollection()
            ->map(fn ($stadium) => (new StadiumResource($stadium))->resolve($request))
            ->all();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $stadiums->currentPage(),
                'last_page' => $stadiums->lastPage(),
                'per_page' => $stadiums->perPage(),
                'total' => $stadiums->total(),
                'filters' => [
                    'cities' => StadiumQuery::base()->distinct()->orderBy('city')->pluck('city'),
                    'types' => ['salle', 'synthetic', 'cement', 'minifoot', 'grass'],
                    'player_formats' => StadiumQuery::base()->whereNotNull('player_format')->distinct()->orderBy('player_format')->pluck('player_format'),
                ],
            ],
        ]);
    }

    public function show(Request $request, string $stadium): JsonResponse
    {
        $model = StadiumQuery::base()
            ->with(['owner', 'schedules'])
            ->when(is_numeric($stadium), fn ($q) => $q->where('id', (int) $stadium))
            ->when(! is_numeric($stadium), fn ($q) => $q->where('slug', $stadium))
            ->firstOrFail();

        return response()->json([
            'data' => new StadiumDetailsResource($model),
        ]);
    }
}
