<?php

namespace App\Domains\Team\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\CurrentTeamResolver;
use App\Domains\Team\Resources\TeamResource;
use App\Domains\Team\Services\TeamProfileService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamProfileController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private CurrentTeamResolver $resolver,
        private TeamProfileService $service,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('view', $team);

        return response()->json([
            'team' => new TeamResource($this->service->show($team)),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('update', $team);

        $validated = $request->validate($this->service->rules());

        return response()->json([
            'message' => 'تم تحديث بيانات الفريق بنجاح!',
            'team' => new TeamResource($this->service->update($request->user(), $team, $validated)),
        ]);
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('uploadLogo', $team);

        $validated = $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,webp|max:'.(int) config('team.gallery.max_size_kb'),
        ]);

        return response()->json([
            'message' => 'تم رفع الشعار بنجاح!',
            'team' => new TeamResource($this->service->uploadLogo($team, $validated['logo'])),
        ]);
    }

    public function uploadCover(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('uploadCover', $team);

        $validated = $request->validate([
            'cover' => 'required|image|mimes:jpeg,png,jpg,webp|max:'.(int) config('team.gallery.max_size_kb'),
        ]);

        return response()->json([
            'message' => 'تم رفع الصورة الغلاف بنجاح!',
            'team' => new TeamResource($this->service->uploadCover($team, $validated['cover'])),
        ]);
    }
}
