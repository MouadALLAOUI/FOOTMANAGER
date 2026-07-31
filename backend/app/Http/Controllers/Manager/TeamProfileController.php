<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TeamProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $team = $request->user()->team()
            ->with(['primaryStadium', 'manager'])
            ->first();

        if (!$team) {
            return response()->json(['message' => 'لا يوجد فريق مرتبط بحسابك'], 404);
        }

        return response()->json(['team' => $team]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'member_count' => 'required|integer|min:1',
            'category' => 'required|in:adult,teenager,children',
            'association_name' => 'nullable|string|max:255',
            'primary_stadium_id' => 'nullable|exists:stadiums,id',
            'city' => 'nullable|string|max:255',
            'region' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'primary_color' => 'nullable|string|max:20',
            'secondary_color' => 'nullable|string|max:20',
        ]);

        $team = $request->user()->team;

        if (!$team) {
            return response()->json(['message' => 'لا يوجد فريق مرتبط بحسابك'], 404);
        }

        $team->update($validated);

        return response()->json([
            'message' => 'تم تحديث بيانات الفريق بنجاح!',
            'team' => $team->load(['primaryStadium', 'manager']),
        ]);
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $team = $request->user()->team;

        if (!$team) {
            return response()->json(['message' => 'لا يوجد فريق مرتبط بحسابك'], 404);
        }

        if ($team->logo_path && Storage::disk('public')->exists($team->logo_path)) {
            Storage::disk('public')->delete($team->logo_path);
        }

        $path = $request->file('logo')->store('teams/logos', 'public');

        $team->update(['logo_path' => $path]);

        return response()->json([
            'message' => 'تم رفع الشعار بنجاح!',
            'logo_url' => $team->logo_url,
            'team' => $team->load(['primaryStadium', 'manager']),
        ]);
    }
}
