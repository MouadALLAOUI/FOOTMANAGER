<?php

namespace App\Domains\Team\Controllers;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\CurrentTeamResolver;
use App\Domains\Team\Resources\TeamResource;
use App\Domains\Team\Services\CaptainService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CaptainController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private CurrentTeamResolver $resolver,
        private CaptainService $service,
    ) {}

    public function assignCaptain(Request $request, Player $player): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('assignCaptain', $team);

        $team = $this->service->assignCaptain($team, $player);

        return response()->json([
            'message' => 'تم تعيين الكابتن بنجاح!',
            'team' => new TeamResource($team),
        ]);
    }

    public function assignViceCaptain(Request $request, Player $player): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('assignCaptain', $team);

        $team = $this->service->assignViceCaptain($team, $player);

        return response()->json([
            'message' => 'تم تعيين نائب الكابتن بنجاح!',
            'team' => new TeamResource($team),
        ]);
    }

    public function removeCaptain(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('assignCaptain', $team);

        $team = $this->service->removeCaptain($team);

        return response()->json([
            'message' => 'تم إلغاء تعيين الكابتن.',
            'team' => new TeamResource($team),
        ]);
    }

    public function removeViceCaptain(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('assignCaptain', $team);

        $team = $this->service->removeViceCaptain($team);

        return response()->json([
            'message' => 'تم إلغاء تعيين نائب الكابتن.',
            'team' => new TeamResource($team),
        ]);
    }
}
