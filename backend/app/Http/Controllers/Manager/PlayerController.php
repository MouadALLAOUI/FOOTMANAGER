<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Models\Player;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlayerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $teamId = $request->user()->team->id;

        $players = Player::where('team_id', $teamId)
            ->orderBy('number')
            ->orderBy('name')
            ->get();

        return response()->json(['players' => $players]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'position' => 'nullable|string|max:100',
            'number' => 'nullable|integer|min:0|max:99',
            'phone' => 'nullable|string|max:20',
            'is_whatsapp' => 'boolean',
            'notes' => 'nullable|string|max:500',
        ]);

        $teamId = $request->user()->team->id;

        $player = Player::create([
            'team_id' => $teamId,
            'name' => $validated['name'],
            'position' => $validated['position'] ?? null,
            'number' => $validated['number'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'is_whatsapp' => $validated['is_whatsapp'] ?? false,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'تم إضافة اللاعب بنجاح',
            'player' => $player,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $teamId = $request->user()->team->id;

        $player = Player::where('id', $id)->where('team_id', $teamId)->firstOrFail();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'position' => 'nullable|string|max:100',
            'number' => 'nullable|integer|min:0|max:99',
            'phone' => 'nullable|string|max:20',
            'is_whatsapp' => 'boolean',
            'notes' => 'nullable|string|max:500',
        ]);

        $player->update($validated);

        return response()->json([
            'message' => 'تم تحديث بيانات اللاعب بنجاح',
            'player' => $player->fresh(),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $teamId = $request->user()->team->id;

        $player = Player::where('id', $id)->where('team_id', $teamId)->firstOrFail();

        $player->delete();

        return response()->json([
            'message' => 'تم حذف اللاعب بنجاح',
        ]);
    }
}
