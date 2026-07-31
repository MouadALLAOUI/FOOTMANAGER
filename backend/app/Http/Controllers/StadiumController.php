<?php

namespace App\Http\Controllers;

use App\Models\Stadium;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StadiumController extends Controller
{
    public function index(): JsonResponse
    {
        $stadiums = Stadium::with('owner:id,name')
            ->select('id', 'name', 'city', 'address', 'capacity', 'owner_id', 'type', 'player_format', 'has_benches', 'supports_tournaments', 'has_lighting', 'has_vestiaires', 'price_per_team', 'total_price', 'is_available')
            ->orderBy('name')
            ->get();

        return response()->json(['stadiums' => $stadiums]);
    }

    public function publicTerrains(Request $request): JsonResponse
    {
        $query = Stadium::with(['owner:id,name', 'images'])
            ->where('is_available', true)
            ->whereHas('owner', fn ($q) => $q->where('status', 'approved'))
            ->latest();

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        if ($request->filled('city')) {
            $query->where('city', $request->query('city'));
        }

        if ($request->filled('player_format')) {
            $query->where('player_format', $request->query('player_format'));
        }

        $terrains = $query->get([
            'id', 'name', 'city', 'address', 'owner_id', 'type', 'player_format',
            'has_benches', 'supports_tournaments', 'has_lighting', 'has_vestiaires',
            'price_per_team', 'total_price', 'is_available', 'google_maps_url',
        ]);

        return response()->json(['terrains' => $terrains]);
    }
}
