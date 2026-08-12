<?php

namespace App\Domains\Team\Controllers;

use App\Domains\Match\Resources\FixtureResource;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\CurrentTeamResolver;
use App\Domains\Team\Services\TeamFixtureService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TeamFixtureController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private CurrentTeamResolver $resolver,
        private TeamFixtureService $service,
    ) {}

    public function upcoming(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('viewFixtures', $team);

        $fixtures = $this->service->upcoming($team);

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

        return FixtureResource::collection($this->service->history($team, $validated['per_page'] ?? 15));
    }
}
