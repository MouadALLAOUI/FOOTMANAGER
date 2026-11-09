<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Competition\Models\Group;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Services\TournamentDrawService;
use App\Http\Requests\Committee\AssignTeamToGroupRequest;
use App\Http\Requests\Committee\SaveDrawRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        if ($tournament->isCompleted() || $tournament->isCancelled() || $tournament->hasSettledResult()) {
            throw new DomainException('لا يمكن تأكيد القرعة بعد تسجيل أول نتيجة');
        }

        return response()->json(['data' => $this->draw->confirmDraw($tournament)]);
    }

    /**
     * Re-open the draw for editing. Only possible until the tournament locks
     * (first settled result / completed / cancelled).
     */
    public function unconfirm(Tournament $tournament): Response
    {
        $this->authorize('manage', $tournament);

        if ($tournament->isCompleted() || $tournament->isCancelled() || $tournament->hasSettledResult()) {
            throw new DomainException('لا يمكن فتح القرعة بعد تسجيل أول نتيجة');
        }

        $this->draw->unconfirmDraw($tournament);

        return response()->noContent();
    }

    /**
     * Rename a group within the tournament.
     * Preserves group ID, fixtures, team assignments, standings, and results integrity.
     */
    public function renameGroup(Request $request, Tournament $tournament, int $groupId): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if ($tournament->isCompleted() || $tournament->isCancelled()) {
            throw new DomainException('لا يمكن تعديل المجموعات في بطولة مكتملة أو ملغاة');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:60'],
        ], [
            'name.required' => 'اسم المجموعة مطلوب',
            'name.max' => 'اسم المجموعة لا يمكن أن يتجاوز 60 حرفاً',
        ]);

        $name = trim($validated['name']);
        if ($name === '') {
            throw new DomainException('اسم المجموعة لا يمكن أن يكون فارغاً');
        }

        /** @var Group $group */
        $group = Group::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('id', $groupId)
            ->firstOrFail();

        // Check for duplicate group name in this tournament (excluding this group itself)
        $exists = Group::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('id', '!=', $groupId)
            ->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower($name)])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'اسم المجموعة مستخدم بالفعل في هذه البطولة. يرجى اختيار اسم مختلف.',
                'errors' => [
                    'name' => ['اسم المجموعة مستخدم بالفعل في هذه البطولة'],
                ],
            ], 422);
        }

        $group->update(['name' => $name]);

        return response()->json([
            'message' => 'تم تغيير اسم المجموعة بنجاح',
            'data' => [
                'id' => $group->id,
                'name' => $group->name,
            ],
            'draw' => $this->draw->currentDraw($tournament),
        ]);
    }

    private function assertEditableDraw(Tournament $tournament): void
    {
        if ($tournament->isCompleted() || $tournament->isCancelled() || $tournament->hasSettledResult()) {
            throw new DomainException('لا يمكن تعديل القرعة بعد تسجيل أول نتيجة');
        }

        if ($tournament->draw_confirmed_at !== null) {
            throw new DomainException('القرعة مؤكدة، افتحها أولاً لتعديل التوزيع');
        }
    }
}
