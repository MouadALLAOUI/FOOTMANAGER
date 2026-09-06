<?php

namespace App\Domains\Team\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\CurrentTeamResolver;
use App\Domains\Team\Requests\StoreFormationPresetRequest;
use App\Domains\Team\Requests\StoreFormationRequest;
use App\Domains\Team\Requests\UpdateFormationPresetRequest;
use App\Domains\Team\Requests\UpdateFormationRequest;
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

    public function index(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('viewFormation', $team);

        $tournamentId = $request->query('tournament_id') ? (int) $request->query('tournament_id') : null;

        return response()->json([
            'data' => FormationResource::collection($this->service->list($team, $tournamentId)),
        ]);
    }

    public function store(StoreFormationRequest $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('manageFormation', $team);

        $formation = $this->service->create($team, $request->validated());

        return response()->json([
            'message' => 'تم حفظ التشكيلة بنجاح!',
            'data' => new FormationResource($formation),
        ], 201);
    }

    public function show(Request $request, int $formation): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('viewFormation', $team);

        return response()->json([
            'data' => new FormationResource($this->service->find($team, $formation)),
        ]);
    }

    public function update(UpdateFormationRequest $request, int $formation): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('manageFormation', $team);

        $formation = $this->service->find($team, $formation);

        return response()->json([
            'message' => 'تم حفظ التشكيلة بنجاح!',
            'data' => new FormationResource($this->service->update($team, $formation, $request->validated())),
        ]);
    }

    public function destroy(Request $request, int $formation): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('manageFormation', $team);

        $formation = $this->service->find($team, $formation);
        $this->service->delete($team, $formation);

        return response()->json([
            'message' => 'تم حذف التشكيلة بنجاح',
        ]);
    }

    public function activate(Request $request, int $formation): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('manageFormation', $team);

        $formationModel = $this->service->find($team, $formation);
        $activated = $this->service->activate($team, $formationModel);

        return response()->json([
            'message' => 'تم تعيين التشكيلة كتشكيلة أساسية بنجاح!',
            'data' => new FormationResource($activated),
        ]);
    }

    public function presets(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->service->presets($this->resolver->teamIdFor($request->user())),
        ]);
    }

    // ── Custom preset management (structure-only, per team) ──────────

    public function storePreset(StoreFormationPresetRequest $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('manageFormation', $team);

        $preset = $this->service->createPreset($team, $request->validated());

        return response()->json([
            'message' => 'تم حفظ الخطة بنجاح',
            'data' => $preset->toPreset(),
        ], 201);
    }

    public function updatePreset(UpdateFormationPresetRequest $request, int $preset): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('manageFormation', $team);

        $preset = $this->service->updatePreset($team, $preset, $request->validated());

        return response()->json([
            'message' => 'تم تحديث الخطة بنجاح',
            'data' => $preset->toPreset(),
        ]);
    }

    public function destroyPreset(Request $request, int $preset): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('manageFormation', $team);

        $this->service->deletePreset($team, $preset);

        return response()->json([
            'message' => 'تم حذف الخطة بنجاح',
        ]);
    }

    // ── Legacy single-formation endpoints (active formation) ──────

    public function legacyShow(Request $request): JsonResponse
    {
        $team = $this->resolver->for($request->user());

        $this->authorize('viewFormation', $team);

        return response()->json([
            'data' => new FormationResource($this->service->get($team)),
        ]);
    }

    public function legacyUpdate(Request $request): JsonResponse
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
