<?php

namespace App\Domains\Team\Controllers;

use App\Domains\Match\Resources\FixtureResource;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\CurrentTeamResolver;
use App\Domains\Team\Resources\AnnouncementResource;
use App\Domains\Team\Resources\TeamGalleryResource;
use App\Domains\Team\Resources\TeamResource;
use App\Domains\Team\Services\TeamAnnouncementService;
use App\Domains\Team\Services\TeamFixtureService;
use App\Domains\Team\Services\TeamGalleryService;
use App\Domains\Team\Services\TeamProfileService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TeamController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private CurrentTeamResolver $resolver,
        private TeamProfileService $profile,
        private TeamGalleryService $gallery,
        private TeamFixtureService $fixtures,
        private TeamAnnouncementService $announcements,
    ) {}

    public function profile(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('view', $team);

        return response()->json([
            'team' => new TeamResource($this->profile->show($team)),
        ]);
    }

    public function gallery(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('viewGallery', $team);

        $data = $this->gallery->index($team);

        return response()->json([
            'data' => TeamGalleryResource::collection($data['images']),
            'total' => $data['total'],
        ]);
    }

    public function upcoming(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('viewFixtures', $team);

        $fixtures = $this->fixtures->upcoming($team);

        return response()->json([
            'data' => FixtureResource::collection($fixtures),
            'total' => $fixtures->count(),
        ]);
    }

    public function history(Request $request): JsonResponse|AnonymousResourceCollection
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('viewFixtures', $team);

        $validated = $request->validate([
            'per_page' => 'sometimes|integer|min:1|max:50',
        ]);

        return FixtureResource::collection($this->fixtures->history($team, $validated['per_page'] ?? 15));
    }

    public function announcements(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('viewAnnouncements', $team);

        $result = $this->announcements->index($team, $request->user());

        return response()->json([
            'data' => AnnouncementResource::collection($result['announcements']),
            'total_unread' => $result['total_unread'],
        ]);
    }
}
