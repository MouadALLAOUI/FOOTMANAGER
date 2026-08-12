<?php

namespace App\Domains\Team\Controllers;

use App\Domains\Player\Models\Player;
use App\Domains\Player\Resources\PlayerResource;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\CurrentTeamResolver;
use App\Domains\Team\Services\PlayerService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlayerController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private CurrentTeamResolver $resolver,
        private PlayerService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('view', $team);

        return response()->json([
            'data' => PlayerResource::collection($this->service->index($team)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('managePlayers', $team);

        $validated = $request->validate($this->service->rules(true));

        $player = $this->service->store($team, $request->user(), $validated);

        return response()->json([
            'message' => 'تمت إضافة اللاعب بنجاح!',
            'data' => new PlayerResource($player),
        ], 201);
    }

    public function show(Request $request, Player $player): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('view', $team);

        if ((int) $player->team_id !== (int) $team->id) {
            abort(404);
        }

        return response()->json([
            'data' => new PlayerResource($this->service->show($team, $player)),
        ]);
    }

    public function update(Request $request, Player $player): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('managePlayers', $team);

        if ((int) $player->team_id !== (int) $team->id) {
            abort(404);
        }

        $validated = $request->validate($this->service->rules(false));

        $player = $this->service->update($team, $player, $validated);

        return response()->json([
            'message' => 'تم تحديث بيانات اللاعب بنجاح!',
            'data' => new PlayerResource($player),
        ]);
    }

    public function destroy(Request $request, Player $player): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('managePlayers', $team);

        if ((int) $player->team_id !== (int) $team->id) {
            abort(404);
        }

        $this->service->destroy($team, $player);

        return response()->json([
            'message' => 'تم حذف اللاعب بنجاح!',
        ]);
    }
}
