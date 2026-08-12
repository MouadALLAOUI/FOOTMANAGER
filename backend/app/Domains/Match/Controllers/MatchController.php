<?php

namespace App\Domains\Match\Controllers;

use App\Domains\Match\Queries\LiveMatchQuery;
use App\Domains\Match\Queries\MatchFeedQuery;
use App\Domains\Match\Resources\LiveMatchResource;
use App\Domains\Match\Resources\MatchFeedResource;
use App\Domains\Shared\Base\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MatchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = MatchFeedQuery::applyFilters(MatchFeedQuery::base(), $request);

        $perPage = min(max((int) $request->query('per_page', 20), 1), 50);
        $matches = $query->paginate($perPage)->withQueryString();

        $data = $matches->getCollection()
            ->map(fn ($match) => (new MatchFeedResource($match))->resolve($request))
            ->all();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $matches->currentPage(),
                'last_page' => $matches->lastPage(),
                'per_page' => $matches->perPage(),
                'total' => $matches->total(),
            ],
        ]);
    }

    public function live(Request $request): JsonResponse
    {
        $matches = LiveMatchQuery::base()->limit(50)->get();

        $data = $matches
            ->map(fn ($match) => (new LiveMatchResource($match))->resolve($request))
            ->all();

        return response()->json([
            'data' => $data,
            'count' => count($data),
        ]);
    }
}
