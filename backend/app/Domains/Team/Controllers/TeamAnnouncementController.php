<?php

namespace App\Domains\Team\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\CurrentTeamResolver;
use App\Domains\Team\Models\TeamAnnouncement;
use App\Domains\Team\Resources\AnnouncementResource;
use App\Domains\Team\Services\TeamAnnouncementService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamAnnouncementController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private CurrentTeamResolver $resolver,
        private TeamAnnouncementService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('viewAnnouncements', $team);

        $result = $this->service->index($team, $request->user());

        return response()->json([
            'data' => AnnouncementResource::collection($result['announcements']),
            'total_unread' => $result['total_unread'],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('manageAnnouncements', $team);

        $validated = $request->validate($this->service->rules());

        $announcement = $this->service->store($team, $request->user(), $validated);

        return response()->json([
            'message' => $announcement->isScheduled()
                ? 'تمت جدولة الإعلان وسيتم نشره في الموعد المحدد.'
                : 'تم نشر الإعلان بنجاح!',
            'data' => new AnnouncementResource($announcement),
        ], 201);
    }

    public function show(Request $request, TeamAnnouncement $announcement): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('view', $announcement);

        if ((int) $announcement->team_id !== (int) $team->id) {
            abort(404);
        }

        return response()->json([
            'data' => new AnnouncementResource($announcement->load('creator:id,name')),
        ]);
    }

    public function update(Request $request, TeamAnnouncement $announcement): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('update', $announcement);

        if ((int) $announcement->team_id !== (int) $team->id) {
            abort(404);
        }

        $validated = $request->validate($this->service->updateRules());

        $announcement = $this->service->update($team, $announcement, $validated);

        return response()->json([
            'message' => 'تم تحديث الإعلان بنجاح!',
            'data' => new AnnouncementResource($announcement),
        ]);
    }

    public function destroy(Request $request, TeamAnnouncement $announcement): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('delete', $announcement);

        if ((int) $announcement->team_id !== (int) $team->id) {
            abort(404);
        }

        $this->service->destroy($team, $announcement);

        return response()->json([
            'message' => 'تم حذف الإعلان بنجاح!',
        ]);
    }

    public function markRead(Request $request, TeamAnnouncement $announcement): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('view', $announcement);

        if ((int) $announcement->team_id !== (int) $team->id) {
            abort(404);
        }

        $player = $request->user()->rosterPlayer;

        if (! $player) {
            return response()->json(['message' => 'الإعلان خاص بلاعبي الفريق'], 403);
        }

        $this->service->markRead($announcement, $player);

        return response()->json([
            'message' => 'تم تحديد الإعلان كمقروء.',
            'data' => new AnnouncementResource($announcement->load('creator:id,name')),
        ]);
    }
}
