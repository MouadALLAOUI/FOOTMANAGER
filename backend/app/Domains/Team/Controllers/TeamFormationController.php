<?php

namespace App\Domains\Team\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\CurrentTeamResolver;
use App\Domains\Team\Resources\FormationResource;
use App\Domains\Team\Services\TeamFormationService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamFormationController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private CurrentTeamResolver $resolver,
        private TeamFormationService $service,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('viewFormation', $team);

        return response()->json([
            'data' => new FormationResource($this->service->get($team)),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('manageFormation', $team);

        $validated = $request->validate($this->service->rules());

        $formation = $this->service->save($team, $validated);

        return response()->json([
            'message' => 'تم حفظ التشكيلة بنجاح!',
            'data' => new FormationResource($formation),
        ]);
    }
}
