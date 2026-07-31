<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use App\Models\Stadium;
use App\Models\TerrainSlotClosure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SlotClosureController extends Controller
{
    public function index(Request $request, int $terrainId): JsonResponse
    {
        $user = $request->user();
        $terrain = Stadium::where('id', $terrainId)->where('owner_id', $user->id)->firstOrFail();

        $closures = TerrainSlotClosure::where('terrain_id', $terrain->id)
            ->where('closure_date', '>=', now()->subDay()->toDateString())
            ->orderBy('closure_date')
            ->orderBy('start_time')
            ->get();

        return response()->json(['closures' => $closures]);
    }

    public function store(Request $request, int $terrainId): JsonResponse
    {
        $user = $request->user();
        $terrain = Stadium::where('id', $terrainId)->where('owner_id', $user->id)->firstOrFail();

        $validated = $request->validate([
            'closure_date' => 'required|date|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'reason' => 'nullable|string|max:255',
        ]);

        $validated['terrain_id'] = $terrain->id;

        $closure = TerrainSlotClosure::create($validated);

        return response()->json([
            'message' => 'تم إغلاق التوقيت بنجاح',
            'closure' => $closure,
        ], 201);
    }

    public function destroy(Request $request, int $terrainId, int $closureId): JsonResponse
    {
        $user = $request->user();
        $terrain = Stadium::where('id', $terrainId)->where('owner_id', $user->id)->firstOrFail();

        $closure = TerrainSlotClosure::where('id', $closureId)
            ->where('terrain_id', $terrain->id)
            ->firstOrFail();

        $closure->delete();

        return response()->json(['message' => 'تم فتح التوقيت بنجاح']);
    }
}
