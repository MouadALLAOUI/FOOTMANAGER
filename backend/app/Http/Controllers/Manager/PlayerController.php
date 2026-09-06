<?php

namespace App\Http\Controllers\Manager;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Services\ImageThumbnailService;
use App\Domains\Shared\Support\CurrentTeamResolver;
use App\Domains\Team\Services\ManagerRosterService;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PlayerController extends Controller
{
    public function __construct(
        private ManagerRosterService $roster,
        private CurrentTeamResolver $resolver,
        private ImageThumbnailService $images,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());
        $players = $this->roster->list($team->id);

        return response()->json(['players' => $players]);
    }

    public function store(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'position' => 'nullable|string|max:100',
            'number' => 'nullable|integer|min:0|max:99',
            'phone' => 'nullable|string|max:20',
            'is_whatsapp' => 'boolean',
            'notes' => 'nullable|string|max:500',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            'role' => 'nullable|string|in:starter,substitute,reserve',
            'preferred_foot' => 'nullable|string|in:left,right,both',
            'height_cm' => 'nullable|integer|min:50|max:250',
            'weight_kg' => 'nullable|integer|min:20|max:200',
        ]);

        $currentCount = Player::where('team_id', $team->id)->count();
        $maxMembers = (int) Setting::get('max_team_members', 30);
        if ($currentCount >= $maxMembers) {
            return response()->json(['message' => 'تم الوصول للحد الأقصى لأعضاء الفريق'], 422);
        }

        if ($request->hasFile('photo')) {
            $stored = $this->images->storeWithThumbnail($request->file('photo'), 'players/photos');
            $validated['photo_path'] = $stored['path'];
            $validated['photo_thumbnail_path'] = $stored['thumbnail_path'];
        } elseif ($request->filled('photo_preset_id')) {
            $preset = \App\Models\Preset::query()->active()->find($request->input('photo_preset_id'));
            if ($preset && $preset->image_path) {
                $stored = $this->images->copyFromPath($preset->image_path, 'players/photos');
                $validated['photo_path'] = $stored['path'];
                $validated['photo_thumbnail_path'] = $stored['thumbnail_path'];
            }
        }

        $player = $this->roster->create($team->id, $validated);

        return response()->json([
            'message' => 'تم إضافة اللاعب بنجاح',
            'player' => $player->fresh(),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $player = $this->roster->findForTeam($team->id, $id);
        abort_unless($player, 404, 'اللاعب غير موجود في هذا الفريق');

        $rules = [
            'position' => 'nullable|string|max:100',
            'number' => 'nullable|integer|min:0|max:99',
            'phone' => 'nullable|string|max:20',
            'is_whatsapp' => 'boolean',
            'notes' => 'nullable|string|max:500',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            'photo_preset_id' => 'nullable|integer|exists:presets,id',
            'remove_photo' => 'nullable|boolean',
            'role' => 'nullable|string|in:starter,substitute,reserve',
            'preferred_foot' => 'nullable|string|in:left,right,both',
            'height_cm' => 'nullable|integer|min:50|max:250',
            'weight_kg' => 'nullable|integer|min:20|max:200',
        ];

        // Only manual players (user_id === null) have their name editable by the manager.
        // For account-linked players, name and profile are owned by the user account.
        if ($player->isManual()) {
            $rules['name'] = 'sometimes|required|string|max:255';
        }

        $validated = $request->validate($rules);

        if ($request->hasFile('photo')) {
            if ($player->photo_path && Storage::disk('public')->exists($player->photo_path)) {
                Storage::disk('public')->delete($player->photo_path);
            }
            if ($player->photo_thumbnail_path && Storage::disk('public')->exists($player->photo_thumbnail_path)) {
                Storage::disk('public')->delete($player->photo_thumbnail_path);
            }

            $stored = $this->images->storeWithThumbnail($request->file('photo'), 'players/photos');
            $validated['photo_path'] = $stored['path'];
            $validated['photo_thumbnail_path'] = $stored['thumbnail_path'];
        } elseif ($request->filled('photo_preset_id')) {
            if ($player->photo_path && Storage::disk('public')->exists($player->photo_path)) {
                Storage::disk('public')->delete($player->photo_path);
            }
            if ($player->photo_thumbnail_path && Storage::disk('public')->exists($player->photo_thumbnail_path)) {
                Storage::disk('public')->delete($player->photo_thumbnail_path);
            }

            $preset = \App\Models\Preset::query()->active()->find($request->input('photo_preset_id'));
            if ($preset && $preset->image_path) {
                $stored = $this->images->copyFromPath($preset->image_path, 'players/photos');
                $validated['photo_path'] = $stored['path'];
                $validated['photo_thumbnail_path'] = $stored['thumbnail_path'];
            }
        } elseif ($request->boolean('remove_photo')) {
            if ($player->photo_path && Storage::disk('public')->exists($player->photo_path)) {
                Storage::disk('public')->delete($player->photo_path);
            }
            if ($player->photo_thumbnail_path && Storage::disk('public')->exists($player->photo_thumbnail_path)) {
                Storage::disk('public')->delete($player->photo_thumbnail_path);
            }
            $validated['photo_path'] = null;
            $validated['photo_thumbnail_path'] = null;
        }

        $player = $this->roster->update($player, $validated);

        return response()->json([
            'message' => 'تم تحديث بيانات اللاعب بنجاح',
            'player' => $player->fresh(),
        ]);
    }

    public function uploadPhoto(Request $request, int $id): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $player = $this->roster->findForTeam($team->id, $id);
        abort_unless($player, 404, 'اللاعب غير موجود في هذا الفريق');

        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        if ($player->photo_path && Storage::disk('public')->exists($player->photo_path)) {
            Storage::disk('public')->delete($player->photo_path);
        }
        if ($player->photo_thumbnail_path && Storage::disk('public')->exists($player->photo_thumbnail_path)) {
            Storage::disk('public')->delete($player->photo_thumbnail_path);
        }

        $stored = $this->images->storeWithThumbnail($request->file('photo'), 'players/photos');
        $player->update([
            'photo_path' => $stored['path'],
            'photo_thumbnail_path' => $stored['thumbnail_path'],
        ]);

        return response()->json([
            'message' => 'تم تحديث صورة اللاعب بنجاح',
            'player' => $player->fresh(),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $player = $this->roster->findForTeam($team->id, $id);
        abort_unless($player, 404, 'اللاعب غير موجود في هذا الفريق');

        if ($player->photo_path && Storage::disk('public')->exists($player->photo_path)) {
            Storage::disk('public')->delete($player->photo_path);
        }
        if ($player->photo_thumbnail_path && Storage::disk('public')->exists($player->photo_thumbnail_path)) {
            Storage::disk('public')->delete($player->photo_thumbnail_path);
        }

        $this->roster->delete($player);

        return response()->json([
            'message' => 'تم حذف اللاعب بنجاح',
        ]);
    }
}
