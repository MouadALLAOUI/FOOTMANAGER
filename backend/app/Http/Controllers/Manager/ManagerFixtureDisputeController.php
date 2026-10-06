<?php

namespace App\Http\Controllers\Manager;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Services\DelegatedMatchEntryService;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagerFixtureDisputeController extends Controller
{
    public function __construct(
        private readonly DelegatedMatchEntryService $delegatedService,
    ) {}

    /**
     * File an objection against a submitted match score.
     */
    public function dispute(Request $request, Fixture $fixture): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $managedTeamIds = $user->managedTeams()->pluck('id')->all();

        // Verify that the manager belongs to one of the two fixture teams
        $fixtureTeamIds = array_filter([$fixture->home_team_id, $fixture->away_team_id]);
        $matchingTeamId = null;

        foreach ($fixtureTeamIds as $teamId) {
            if (in_array($teamId, $managedTeamIds, true)) {
                $matchingTeamId = $teamId;
                break;
            }
        }

        if (! $matchingTeamId) {
            throw new DomainException('غير مصرح لك بالاعتراض على نتيجة هذه المباراة', 403);
        }

        $submission = $this->delegatedService->disputeSubmission(
            $fixture,
            $user->id,
            $matchingTeamId,
            $validated['reason']
        );

        return response()->json([
            'data' => $submission,
            'message' => 'تم تسجيل اعتراضك على النتيجة بنجاح وإشعار اللجنة المنظمة',
        ]);
    }
}
