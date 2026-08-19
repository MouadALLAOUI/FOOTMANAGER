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

        $this->assertEditableDraw($tournament);

        return response()->json(['data' => $this->draw->autoDraw($tournament)]);
    }

    public function assign(AssignTeamToGroupRequest $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $this->assertEditableDraw($tournament);

        return response()->json([
            'data' => $this->draw->assignTeam(
                $tournament,
                (int) $request->input('team_id'),
                $request->filled('group_id') ? (int) $request->input('group_id') : null,
                $request->filled('group_position') ? (int) $request->input('group_position') : null,
                $request->boolean('new_group'),
            ),
        ]);
    }

    public function save(SaveDrawRequest $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $this->assertEditableDraw($tournament);

        return response()->json([
            'data' => $this->draw->saveDraw(
                $tournament,
                $request->input('teams', []),
                collect($request->input('groups', []))->pluck('key')->all(),
            ),
        ]);
    }

    public function destroy(Tournament $tournament): Response
    {
        $this->authorize('manage', $tournament);

        $this->assertEditableDraw($tournament);

        $this->draw->resetDraw($tournament);

        return response()->noContent();
    }

    /**
     * Finalize the draw. After this the board is locked until it is unlocked
     * explicitly (and permanently once fixtures have been generated).
     */
    public function confirm(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if (! $tournament->isEditable()) {
            throw new DomainException('لا يمكن تأكيد القرعة بعد انطلاق البطولة');
        }

        if ($tournament->fixtures()->count() > 0) {
            throw new DomainException('لا يمكن تأكيد القرعة بعد إنشاء برنامج المباريات');
        }

        return response()->json(['data' => $this->draw->confirmDraw($tournament)]);
    }

    /**
     * Re-open the draw for editing. Only possible while the tournament is
     * editable and no fixtures depend on the draw yet.
     */
    public function unconfirm(Tournament $tournament): Response
    {
        $this->authorize('manage', $tournament);

        if (! $tournament->isEditable()) {
            throw new DomainException('لا يمكن فتح القرعة بعد انطلاق البطولة');
        }

        if ($tournament->fixtures()->count() > 0) {
            throw new DomainException('لا يمكن فتح القرعة بعد إنشاء برنامج المباريات');
        }

        $this->draw->unconfirmDraw($tournament);

        return response()->noContent();
    }

    private function assertEditableDraw(Tournament $tournament): void
    {
        if (! $tournament->isEditable()) {
            throw new DomainException('لا يمكن تعديل القرعة بعد انطلاق البطولة');
        }

        if ($tournament->fixtures()->count() > 0) {
            throw new DomainException('لا يمكن تعديل القرعة بعد إنشاء برنامج المباريات');
        }

        if ($tournament->draw_confirmed_at !== null) {
            throw new DomainException('القرعة مؤكدة، افتحها أولاً لتعديل التوزيع');
        }
    }
}
