<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Models\MatchDelegatedSubmission;
use App\Domains\Match\Services\DelegatedMatchEntryService;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DelegatedMatchLinkController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly DelegatedMatchEntryService $delegatedService,
    ) {}

    /**
     * Generate or regenerate a secret link for delegated match entry.
     */
    public function generate(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);
        $this->assertBelongsToTournament($tournament, $fixture);

        $result = $this->delegatedService->generateToken(
            $tournament,
            $fixture,
            $request->user()->id
        );

        return response()->json([
            'data' => $result,
            'message' => 'تم إنشاء رابط تسجيل المباراة بنجاح',
        ], 201);
    }

    /**
     * Revoke the secret link immediately.
     */
    public function revoke(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);
        $this->assertBelongsToTournament($tournament, $fixture);

        $this->delegatedService->revokeToken($fixture, $request->user()->id);

        return response()->json([
            'message' => 'تم إلغاء رابط تسجيل المباراة',
        ]);
    }

    /**
     * View pending submission for this fixture (if any), including recorder details & anomaly flags.
     */
    public function showSubmission(Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);
        $this->assertBelongsToTournament($tournament, $fixture);

        $submission = MatchDelegatedSubmission::query()
            ->with(['token', 'disputedByTeam'])
            ->where('fixture_id', $fixture->id)
            ->latest()
            ->first();

        return response()->json([
            'data' => $submission,
        ]);
    }

    /**
     * Approve the pending submission (optionally with committee edits).
     */
    public function approve(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);
        $this->assertBelongsToTournament($tournament, $fixture);

        $overrideData = $request->input('override_data'); // optional edits

        $updatedFixture = $this->delegatedService->approveSubmission(
            $fixture,
            $request->user()->id,
            is_array($overrideData) ? $overrideData : null
        );

        return response()->json([
            'data' => $updatedFixture,
            'message' => 'تم اعتماد نتيجة المباراة بنجاح وتحديث جداول البطولة',
        ]);
    }

    /**
     * Reject the pending submission.
     */
    public function reject(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);
        $this->assertBelongsToTournament($tournament, $fixture);

        $reason = $request->input('rejection_reason');

        $this->delegatedService->rejectSubmission(
            $fixture,
            $request->user()->id,
            is_string($reason) ? $reason : null
        );

        return response()->json([
            'message' => 'تم رفض النتيجة المسجلة وإرجاع المباراة إلى حالتها السابقة',
        ]);
    }

    /**
     * Get all pending delegated submissions for this tournament.
     */
    public function pendingSubmissions(Tournament $tournament): JsonResponse
    {
        $this->authorize('view', $tournament);

        $submissions = MatchDelegatedSubmission::query()
            ->with(['fixture.homeTeam', 'fixture.awayTeam', 'fixture.stadium', 'token', 'disputedByTeam'])
            ->where('status', 'pending')
            ->whereHas('fixture', function ($q) use ($tournament) {
                $q->where('competition_id', $tournament->competition_id)
                  ->where('season_id', $tournament->season_id);
            })
            ->latest()
            ->get();

        $fixtures = $submissions->map(function ($sub) {
            $fixture = $sub->fixture;
            if (! $fixture) return null;
            return [
                'id' => $fixture->id,
                'home_team' => $fixture->homeTeam ? [
                    'id' => $fixture->homeTeam->id,
                    'name' => $fixture->homeTeam->name,
                    'logo_url' => $fixture->homeTeam->logo_url,
                ] : null,
                'away_team' => $fixture->awayTeam ? [
                    'id' => $fixture->awayTeam->id,
                    'name' => $fixture->awayTeam->name,
                    'logo_url' => $fixture->awayTeam->logo_url,
                ] : null,
                'stadium' => $fixture->stadium ? [
                    'id' => $fixture->stadium->id,
                    'name' => $fixture->stadium->name,
                ] : null,
                'scheduled_at' => $fixture->scheduled_at?->toDateTimeString(),
                'status' => $fixture->status?->value,
                'delegated_submission' => [
                    'id' => $sub->id,
                    'status' => $sub->status,
                    'home_score' => $sub->home_score,
                    'away_score' => $sub->away_score,
                    'extra_time' => (bool) $sub->extra_time,
                    'home_penalties' => $sub->home_penalties,
                    'away_penalties' => $sub->away_penalties,
                    'recorder_name' => $sub->recorder_name,
                    'recorder_phone' => $sub->recorder_phone,
                    'anomalies' => $sub->anomalies ?? [],
                    'is_disputed' => (bool) $sub->is_disputed,
                    'dispute_reason' => $sub->dispute_reason,
                    'submitted_at' => $sub->created_at?->toIso8601String(),
                    'events' => $sub->events ?? [],
                    'notes' => $sub->notes,
                    'client_meta' => $sub->client_meta ?? [],
                ],
            ];
        })->filter()->values();

        return response()->json([
            'data' => $fixtures,
            'count' => $fixtures->count(),
        ]);
    }

    private function assertBelongsToTournament(Tournament $tournament, Fixture $fixture): void
    {
        if ((int) $tournament->competition_id !== (int) $fixture->competition_id
            || (int) $tournament->season_id !== (int) $fixture->season_id) {
            throw new DomainException('المباراة لا تنتمي إلى هذه البطولة', 404);
        }
    }
}
