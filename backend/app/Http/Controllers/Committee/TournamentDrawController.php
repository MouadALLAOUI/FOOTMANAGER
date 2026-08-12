<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Services\TournamentDrawService;
use App\Http\Requests\Committee\AssignTeamToGroupRequest;
use App\Http\Requests\Committee\SaveDrawRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class TournamentDrawController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly TournamentDrawService $draw,
    ) {}

    public function show(Tournament $tournament): JsonResponse
    {
        $this->authorize('view', $tournament);

        return response()->json(['data' => $this->draw->currentDraw($tournament)]);
    }

    public function store(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if (! in_array($tournament->status, ['draft', 'published'], true)) {
            return response()->json(['message' => 'لا يمكن سحب القرعة بعد انطلاق البطولة'], 422);
        }

        return response()->json(['data' => $this->draw->autoDraw($tournament)]);
    }

    public function assign(AssignTeamToGroupRequest $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if (! in_array($tournament->status, ['draft', 'published'], true)) {
            throw new DomainException('لا يمكن تعديل القرعة بعد انطلاق البطولة');
        }

        if ($tournament->fixtures()->count() > 0) {
            throw new DomainException('لا يمكن تعديل القرعة بعد إنشاء برنامج المباريات');
        }

        return response()->json([
            'data' => $this->draw->assignTeam(
                $tournament,
                (int) $request->input('team_id'),
                $request->filled('group_id') ? (int) $request->input('group_id') : null,
                $request->filled('group_position') ? (int) $request->input('group_position') : null,
            ),
        ]);
    }

    public function save(SaveDrawRequest $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if (! in_array($tournament->status, ['draft', 'published'], true)) {
            throw new DomainException('لا يمكن تعديل القرعة بعد انطلاق البطولة');
        }

        if ($tournament->fixtures()->count() > 0) {
            throw new DomainException('لا يمكن تعديل القرعة بعد إنشاء برنامج المباريات');
        }

        return response()->json([
            'data' => $this->draw->saveDraw($tournament, $request->input('teams', [])),
        ]);
    }

    public function destroy(Tournament $tournament): Response
    {
        $this->authorize('manage', $tournament);

        if ($tournament->fixtures()->count() > 0) {
            return response()->json(['message' => 'لا يمكن إلغاء القرعة بعد إنشاء برنامج المباريات'], 422);
        }

        $this->draw->resetDraw($tournament);

        return response()->noContent();
    }
}
