<?php

namespace App\Domains\Team\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\CurrentTeamResolver;
use App\Domains\Team\Models\TeamGalleryImage;
use App\Domains\Team\Resources\TeamGalleryResource;
use App\Domains\Team\Services\TeamGalleryService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamGalleryController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private CurrentTeamResolver $resolver,
        private TeamGalleryService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('viewGallery', $team);

        $data = $this->service->index($team);

        return response()->json([
            'data' => TeamGalleryResource::collection($data['images']),
            'max_images' => $data['max_images'],
            'total' => $data['total'],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('manageGallery', $team);

        $validated = $request->validate($this->service->rules());

        $image = $this->service->store($team, $request->user(), $validated['image'], $validated);

        return response()->json([
            'message' => 'تمت إضافة الصورة إلى معرض الفريق بنجاح!',
            'data' => new TeamGalleryResource($image),
        ], 201);
    }

    public function destroy(Request $request, TeamGalleryImage $image): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('manageGallery', $team);

        if ((int) $image->team_id !== (int) $team->id) {
            abort(404);
        }

        $this->service->destroy($team, $image);

        return response()->json([
            'message' => 'تم حذف الصورة بنجاح!',
        ]);
    }

    public function setCover(Request $request, TeamGalleryImage $image): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('manageGallery', $team);

        if ((int) $image->team_id !== (int) $team->id) {
            abort(404);
        }

        $this->service->setCover($team, $image);

        return response()->json([
            'message' => 'تم تعيين الصورة كغلاف للفريق بنجاح!',
            'data' => new TeamGalleryResource($image->fresh()->load('uploader:id,name')),
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('manageGallery', $team);

        $validated = $request->validate([
            'order' => 'required|array',
            'order.*' => 'integer|exists:team_gallery_images,id',
        ]);

        $this->service->reorder($team, $validated['order']);

        return response()->json([
            'message' => 'تم ترتيب المعرض بنجاح!',
        ]);
    }
}
