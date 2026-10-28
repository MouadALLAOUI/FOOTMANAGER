<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Shared\Base\Controller;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Services\TeamDisciplineService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TournamentTeamDisciplineController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly TeamDisciplineService $discipline,
    ) {}

    /**
     * Preview team withdrawal / disqualification consequences and affected matches.
     */
    public function preview(Tournament $tournament, int $teamId): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $data = $this->discipline->getDisciplinePreview($tournament, $teamId);

        return response()->json([
            'data' => $data,
        ]);
    }

    /**
     * Confirm team withdrawal.
     */
    public function withdraw(Request $request, Tournament $tournament, int $teamId): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $reason = $request->input('reason');
        $applyRemaining = $request->boolean('apply_remaining', false);
        $result = $this->discipline->withdrawTeam($tournament, $teamId, $reason, $request->user()?->id, $applyRemaining);

        return response()->json([
            'data' => $result,
            'message' => $applyRemaining
                ? 'تم تسجيل انسحاب الفريق وتطبيق النتائج الاعتبارية على كافة مبارياته المتبقية وتحديث الترتيب بنجاح'
                : 'تم تسجيل انسحاب الفريق من البطولة بنجاح',
        ]);
    }

    /**
     * Confirm team disqualification.
     */
    public function disqualify(Request $request, Tournament $tournament, int $teamId): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $reason = $request->input('reason');
        $applyRemaining = $request->boolean('apply_remaining', false);
        $result = $this->discipline->disqualifyTeam($tournament, $teamId, $reason, $request->user()?->id, $applyRemaining);

        return response()->json([
            'data' => $result,
            'message' => $applyRemaining
                ? 'تم تسجيل طرد الفريق وتطبيق النتائج الاعتبارية على كافة مبارياته المتبقية وتحديث الترتيب بنجاح'
                : 'تم تسجيل طرد الفريق من البطولة بنجاح',
        ]);
    }

    /**
     * Apply default results to all remaining matches of a disciplined team in bulk.
     */
    public function applyAllDefaultResults(Request $request, Tournament $tournament, int $teamId): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $result = $this->discipline->applyAllDefaultResults($tournament, $teamId, $request->user()?->id);

        return response()->json([
            'data' => $result,
            'message' => "تم تطبيق النتائج الاعتبارية بنجاح على {$result['applied_count']} مباراة متبقية وتحديث جدول الترتيب",
        ]);
    }

    /**
     * Reverse withdrawal or disqualification before any sporting consequences have been applied.
     */
    public function reverse(Request $request, Tournament $tournament, int $teamId): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $result = $this->discipline->reverseDiscipline($tournament, $teamId, $request->user()?->id);

        return response()->json([
            'data' => $result,
            'message' => 'تم التراجع عن القرار واستعادة الوضع النشط للفريق بنجاح',
        ]);
    }

    /**
     * Apply default result to a single remaining match individually.
     */
    public function applyDefaultResult(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $validated = $request->validate([
            'withdrawn_team_id' => 'required|integer',
        ], [
            'withdrawn_team_id.required' => 'معرّف الفريق المنسحب أو المقصى مطلوب',
        ]);

        $result = $this->discipline->applyMatchDefaultResult(
            $tournament,
            $fixture,
            $validated['withdrawn_team_id'],
            $request->user()?->id
        );

        return response()->json([
            'data' => $result,
            'message' => $result['message'],
        ]);
    }

    /**
     * Get all unplayed fixtures eligible to receive a freed slot.
     */
    public function unplayedFixtures(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $fixtures = $this->discipline->getUnplayedFixtures($tournament);

        return response()->json([
            'data' => $fixtures,
        ]);
    }

    /**
     * Reassign the freed slot of a default-win match to another unplayed match.
     */
    public function reassignFreedSlot(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $validated = $request->validate([
            'target_fixture_id' => 'required|integer|exists:fixtures,id',
        ], [
            'target_fixture_id.required' => 'يرجى اختيار المباراة المراد إسناد الموعد لها',
            'target_fixture_id.exists' => 'المباراة المختارة غير موجودة',
        ]);

        $result = $this->discipline->reassignFreedSlot(
            $tournament,
            $fixture,
            (int) $validated['target_fixture_id'],
            $request->user()?->id
        );

        return response()->json([
            'data' => $result,
            'message' => $result['message'],
        ]);
    }
}
