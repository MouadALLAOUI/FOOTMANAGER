<?php

namespace App\Domains\Player\Controllers;

use App\Domains\Player\Resources\PlayerAchievementResource;
use App\Domains\Player\Services\PlayerAchievementService;
use App\Domains\Player\Services\PlayerProfileService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AchievementController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private PlayerAchievementService $service,
        private PlayerProfileService $profiles,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $myProgress = $this->service->for($request->user()->id);

        $catalog = $this->service->catalog()->map(function ($achievement) use ($myProgress) {
            $mine = $myProgress->firstWhere('achievement_id', $achievement->id);

            return [
                'key' => $achievement->key,
                'title_ar' => $achievement->title_ar,
                'title_en' => $achievement->title_en,
                'description_ar' => $achievement->description_ar,
                'description_en' => $achievement->description_en,
                'icon' => $achievement->icon,
                'category' => $achievement->category,
                'points' => $achievement->points,
                'progress' => $mine?->progress ?? 0,
                'is_unlocked' => (bool) $mine?->unlocked_at,
                'unlocked_at' => $mine?->unlocked_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'data' => $catalog,
            'summary' => [
                'unlocked_count' => $myProgress->whereNotNull('unlocked_at')->count(),
                'total' => $catalog->count(),
            ],
        ]);
    }

    public function unlocked(Request $request): JsonResponse
    {
        return response()->json([
            'data' => PlayerAchievementResource::collection($this->service->unlocked($request->user()->id)),
        ]);
    }

    public function forUser(Request $request, int $userId): JsonResponse
    {
        $profile = $this->profiles->findForUser($userId);

        if (! $profile) {
            return response()->json(['message' => 'Profile not found.'], 404);
        }

        $this->authorize('view', $profile);

        return response()->json([
            'data' => PlayerAchievementResource::collection($this->service->unlocked($userId)),
        ]);
    }
}
