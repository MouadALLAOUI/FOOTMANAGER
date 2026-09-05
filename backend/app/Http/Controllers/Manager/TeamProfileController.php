<?php

namespace App\Http\Controllers\Manager;

use App\Domains\Shared\Base\Controller;
use App\Models\Preset;
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

        if (! $team) {
            return response()->json(['message' => 'لا يوجد فريق مرتبط بحسابك'], 404);
        }

        $team->manager->makeVisible('phone', 'email', 'is_whatsapp');

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

        if (! $team) {
            return response()->json(['message' => 'لا يوجد فريق مرتبط بحسابك'], 404);
        }

        $team->update($validated);

        $team->load(['primaryStadium', 'manager']);
        $team->manager->makeVisible('phone', 'email', 'is_whatsapp');

        return response()->json([
            'message' => 'تم تحديث بيانات الفريق بنجاح!',
            'team' => $team,
        ]);
    }

    public function applyLogoPreset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'preset_id' => 'required|integer|exists:presets,id',
        ]);

        $preset = Preset::query()->active()->findOrFail($validated['preset_id']);

        if ($preset->category !== Preset::CATEGORY_TEAM_LOGO) {
            return response()->json([
                'message' => 'هذه الصورة الجاهزة ليست شعار فريق',
            ], 422);
        }

        $team = $request->user()->team;

        if (! $team) {
            return response()->json(['message' => 'لا يوجد فريق مرتبط بحسابك'], 404);
        }

        if ($team->logo_path && Storage::disk('public')->exists($team->logo_path)) {
            Storage::disk('public')->delete($team->logo_path);
        }

        if ($team->logo_thumbnail_path && Storage::disk('public')->exists($team->logo_thumbnail_path)) {
            Storage::disk('public')->delete($team->logo_thumbnail_path);
        }

        $result = app(\App\Domains\Shared\Services\ImageThumbnailService::class)
            ->copyFromPath($preset->image_path, 'teams/logos');

        $team->update([
            'logo_path' => $result['path'],
            'logo_thumbnail_path' => $result['thumbnail_path'],
        ]);

        $team->load(['primaryStadium', 'manager']);
        $team->manager->makeVisible('phone', 'email', 'is_whatsapp');

        return response()->json([
            'message' => 'تم تطبيق شعار الفريق بنجاح!',
            'logo_url' => $team->logo_url,
            'logo_thumbnail_url' => $team->logo_thumbnail_url,
            'team' => $team,
        ]);
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $team = $request->user()->team;

        if (! $team) {
            return response()->json(['message' => 'لا يوجد فريق مرتبط بحسابك'], 404);
        }

        if ($team->logo_path && Storage::disk('public')->exists($team->logo_path)) {
            Storage::disk('public')->delete($team->logo_path);
        }

        if ($team->logo_thumbnail_path && Storage::disk('public')->exists($team->logo_thumbnail_path)) {
            Storage::disk('public')->delete($team->logo_thumbnail_path);
        }

        $result = app(\App\Domains\Shared\Services\ImageThumbnailService::class)
            ->storeWithThumbnail($request->file('logo'), 'teams/logos');

        $team->update([
            'logo_path' => $result['path'],
            'logo_thumbnail_path' => $result['thumbnail_path'],
        ]);

        $team->load(['primaryStadium', 'manager']);
        $team->manager->makeVisible('phone', 'email', 'is_whatsapp');

        return response()->json([
            'message' => 'تم رفع الشعار بنجاح!',
            'logo_url' => $team->logo_url,
            'logo_thumbnail_url' => $team->logo_thumbnail_url,
            'team' => $team,
        ]);
    }
}
