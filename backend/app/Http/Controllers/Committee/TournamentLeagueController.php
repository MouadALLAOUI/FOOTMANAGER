<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Services\LeagueAssignmentService;
use App\Domains\Tournament\Services\LeagueEligibilityEngineService;
use Carbon\Carbon;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TournamentLeagueController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly LeagueAssignmentService $leagueAssignment,
        private readonly LeagueEligibilityEngineService $eligibilityEngine,
    ) {}

    /**
     * Get explainable match suggestions for a league tournament.
     */
    public function suggestions(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $suggestions = $this->leagueAssignment->suggestions($tournament);

        return response()->json([
            'data' => $suggestions,
            'count' => count($suggestions),
        ]);
    }

    /**
     * Assign an eligible home booking to an unscheduled league fixture.
     */
    public function assign(Request $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $validated = $request->validate([
            'fixture_id' => 'required|integer|exists:fixtures,id',
            'booking_id' => 'required|integer|exists:terrain_bookings,id',
        ], [
            'fixture_id.required' => 'معرف المباراة مطلوب',
            'booking_id.required' => 'معرف الحجز مطلوب',
        ]);

        $fixture = Fixture::findOrFail($validated['fixture_id']);
        $booking = TerrainBooking::with(['terrain', 'team'])->findOrFail($validated['booking_id']);
        $allowBorrowed = $request->boolean('allow_borrowed', false);

        $slotDate = $request->input('date');

        $result = $this->leagueAssignment->assign($tournament, $fixture, $booking, $allowBorrowed, $slotDate);

        return response()->json([
            'data' => $result,
            'message' => $result['message'],
        ]);
    }

    /**
     * Pre-check scheduling capacity against available slots.
     */
    public function capacityCheck(Request $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $customFirstDay = $request->query('first_match_day');
        if ($customFirstDay) {
            $request->validate([
                'first_match_day' => 'nullable|date',
            ]);
        }

        $result = $this->leagueAssignment->capacityCheck($tournament, $customFirstDay);

        return response()->json([
            'data' => $result,
        ]);
    }

    /**
     * Automatically schedule Single Round Robin league fixtures into available booking slots.
     */
    public function autoSchedule(Request $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $today = Carbon::today()->toDateString();
        $endDate = $tournament->end_date ? $tournament->end_date->toDateString() : null;

        $rules = [
            'first_match_day' => [
                'nullable',
                'date',
                'after_or_equal:'.$today,
            ],
            'force' => 'nullable|boolean',
        ];

        $messages = [
            'first_match_day.date' => 'صيغة تاريخ اليوم الأول غير صالحة',
            'first_match_day.after_or_equal' => 'لا يمكن اختيار تاريخ في الماضي لليوم الأول للدوري',
        ];

        if ($endDate) {
            $rules['first_match_day'][] = 'before:'.$endDate;
            $messages['first_match_day.before'] = 'اليوم الأول يجب أن يكون ضمن فترة الدوري وقبل تاريخ النهاية ('.$endDate.')';
        }

        $validated = $request->validate($rules, $messages);
        $firstMatchDay = $validated['first_match_day'] ?? null;
        $force = $request->boolean('force', false);

        // Check if regenerating or changing first day with existing finished matches or manual edits
        if ($firstMatchDay && $tournament->first_match_day && $tournament->first_match_day->toDateString() !== $firstMatchDay) {
            $matchesWithResults = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->whereHas('match', fn ($q) => $q->where('status', MatchStatus::Finished->value))
                ->with(['homeTeam', 'awayTeam', 'match'])
                ->get();

            if ($matchesWithResults->isNotEmpty() && ! $force) {
                return response()->json([
                    'requires_confirmation' => true,
                    'message' => 'تغيير اليوم الأول يتطلب تأكيداً لوجود مباريات ملعوبة/مسجلة نتائجها سيتم الحفاظ عليها.',
                    'preserved_matches' => $matchesWithResults->map(fn ($f) => [
                        'id' => $f->id,
                        'teams' => ($f->homeTeam?->name ?? 'مضيف').' ضد '.($f->awayTeam?->name ?? 'ضيف'),
                        'score' => $f->match ? ($f->match->home_score.' - '.$f->match->away_score) : null,
                    ]),
                ], 422);
            }
        }

        $result = $this->leagueAssignment->autoSchedule($tournament, $firstMatchDay);

        return response()->json([
            'data' => $result,
            'message' => $result['message'],
        ]);
    }

    /**
     * Get eligible opponents for swapping in a league fixture.
     */
    public function eligibleOpponents(Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $opponents = $this->leagueAssignment->getEligibleOpponents($tournament, $fixture);

        return response()->json([
            'data' => $opponents,
        ]);
    }

    /**
     * Swap opponent for a league fixture with backend validation.
     */
    public function changeOpponent(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $validated = $request->validate([
            'new_opponent_id' => 'required|integer|exists:teams,id',
            'override_warnings' => 'nullable|boolean',
            'override_reason' => 'nullable|string|max:500',
        ], [
            'new_opponent_id.required' => 'معرف الفريق الخصم الجديد مطلوب',
            'new_opponent_id.exists' => 'الفريق المحدد غير موجود',
        ]);

        $overrideWarnings = $request->boolean('override_warnings');

        $result = $this->leagueAssignment->changeOpponent(
            $tournament,
            $fixture,
            $validated['new_opponent_id'],
            $overrideWarnings
        );

        return response()->json([
            'data' => $result,
            'message' => $result['message'],
        ]);
    }

    /**
     * Unassign a booking from a fixture, preserving the fixture in waiting status.
     */
    public function unassign(Request $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $validated = $request->validate([
            'fixture_id' => 'required|integer|exists:fixtures,id',
        ], [
            'fixture_id.required' => 'معرف المباراة مطلوب',
        ]);

        $fixture = Fixture::findOrFail($validated['fixture_id']);

        $result = $this->leagueAssignment->unassign($tournament, $fixture);

        return response()->json([
            'data' => $result,
            'message' => $result['message'],
        ]);
    }

    /**
     * Postpone a single match with reason and optional note.
     */
    public function postpone(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $validated = $request->validate([
            'reason' => 'required|string|in:rain,pitch_condition,team_circumstances,other',
            'note' => 'nullable|string|max:500',
            'freed_action' => 'nullable|string|in:keep_reserved,release_to_tournament,freed',
        ], [
            'reason.required' => 'يرجى اختيار سبب التأجيل',
            'reason.in' => 'سبب التأجيل المختار غير صالح',
        ]);

        $result = $this->leagueAssignment->postponeMatch(
            $tournament,
            $fixture,
            $validated['reason'],
            $validated['note'] ?? null,
            $validated['freed_action'] ?? 'freed'
        );

        return response()->json([
            'data' => $result,
            'message' => $result['message'],
        ]);
    }

    /**
     * Fetch rescheduling suggestions for a postponed match.
     */
    public function postponementSuggestions(Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $suggestions = $this->leagueAssignment->postponementSuggestions($tournament, $fixture);

        return response()->json([
            'data' => $suggestions,
        ]);
    }

    /**
     * Reschedule a postponed match using a selected suggestion.
     */
    public function rescheduleWithSuggestion(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $validated = $request->validate([
            'booking_id' => 'required|integer|exists:terrain_bookings,id',
            'date' => 'required|date',
        ], [
            'booking_id.required' => 'يرجى اختيار موعد الحجز المقترح',
            'date.required' => 'تاريخ الحجز مطلوب',
        ]);

        $result = $this->leagueAssignment->rescheduleWithSuggestion(
            $tournament,
            $fixture,
            $validated['booking_id'],
            $validated['date']
        );

        return response()->json([
            'data' => $result,
            'message' => $result['message'],
        ]);
    }

    /**
     * Action 1: Get eligible schedule swap candidates and pending candidates.
     */
    public function swapScheduleCandidates(Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $result = $this->eligibilityEngine->getEligibleScheduleSwaps($tournament, $fixture);

        return response()->json([
            'data' => $result,
        ]);
    }

    /**
     * Action 1: Swap schedule between two fixtures in one atomic transaction.
     */
    public function swapSchedule(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $validated = $request->validate([
            'target_fixture_id' => 'required|integer|exists:fixtures,id',
        ], [
            'target_fixture_id.required' => 'يرجى اختيار المباراة المراد تبديل الموعد معها',
            'target_fixture_id.exists' => 'المباراة المحددة غير موجودة',
        ]);

        $result = $this->eligibilityEngine->swapSchedules($tournament, $fixture, $validated['target_fixture_id']);

        return response()->json([
            'data' => $result,
            'message' => $result['message'],
        ]);
    }

    /**
     * Action 1: Replace this fixture's slot with a pending/postponed match.
     */
    public function replaceWithPending(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $validated = $request->validate([
            'pending_fixture_id' => 'required|integer|exists:fixtures,id',
        ], [
            'pending_fixture_id.required' => 'يرجى اختيار المباراة المعلقة المراد جدولتها',
            'pending_fixture_id.exists' => 'المباراة المعلقة غير موجودة',
        ]);

        $result = $this->eligibilityEngine->replaceWithPending($tournament, $fixture, $validated['pending_fixture_id']);

        return response()->json([
            'data' => $result,
            'message' => $result['message'],
        ]);
    }

    /**
     * Action 2: Get eligible teams for changing either home or away side.
     */
    public function eligibleTeamsForSide(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $side = $request->query('side', 'away');
        if (! in_array($side, ['home', 'away'], true)) {
            $side = 'away';
        }

        $teams = $this->eligibilityEngine->getEligibleTeamsForSide($tournament, $fixture, $side);

        return response()->json([
            'data' => $teams,
        ]);
    }

    /**
     * Action 2: Change side (home or away) with another eligible team.
     */
    public function changeSide(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $validated = $request->validate([
            'side' => 'required|string|in:home,away',
            'new_team_id' => 'required|integer|exists:teams,id',
            'new_booking_id' => 'nullable|integer|exists:terrain_bookings,id',
            'new_slot_date' => 'nullable|date',
        ], [
            'side.required' => 'يرجى تحديد الطرف المراد تغييره (مضيف أو ضيف)',
            'new_team_id.required' => 'يرجى اختيار الفريق الجديد',
            'new_team_id.exists' => 'الفريق المختار غير موجود',
        ]);

        $result = $this->eligibilityEngine->changeSide(
            $tournament,
            $fixture,
            $validated['side'],
            $validated['new_team_id'],
            $validated['new_booking_id'] ?? null,
            $validated['new_slot_date'] ?? null
        );

        return response()->json([
            'data' => $result,
            'message' => $result['message'],
        ]);
    }

    /**
     * Action 3: Swap roles (host ⇄ guest).
     */
    public function swapRoles(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $validated = $request->validate([
            'new_booking_id' => 'nullable|integer|exists:terrain_bookings,id',
            'new_slot_date' => 'nullable|date',
        ]);

        $result = $this->eligibilityEngine->swapRoles(
            $tournament,
            $fixture,
            $validated['new_booking_id'] ?? null,
            $validated['new_slot_date'] ?? null
        );

        return response()->json([
            'data' => $result,
            'message' => $result['message'],
        ]);
    }

    /**
     * Suggestions for a team's unused slots (for host change or role swap).
     */
    public function hostSlotSuggestions(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $hostTeamId = $request->integer('host_team_id');
        if (! $hostTeamId) {
            return response()->json(['data' => []]);
        }

        $suggestions = $this->eligibilityEngine->getUnusedSlotsForTeam($tournament, $fixture, $hostTeamId);

        return response()->json([
            'data' => $suggestions,
        ]);
    }

    /**
     * Undo last match management change on fixture.
     */
    public function undoChange(Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $result = $this->eligibilityEngine->undoLastChange($tournament, $fixture);

        return response()->json([
            'data' => $result,
            'message' => $result['message'],
        ]);
    }

    /**
     * Step 2.3: Release an occurrence to tournament teams.
     */
    public function releaseOccurrence(Tournament $tournament, \App\Domains\Booking\Models\TerrainBookingOccurrence $occurrence): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $result = $this->leagueAssignment->releaseOccurrence($tournament, $occurrence);

        return response()->json([
            'data' => $result['occurrence'],
            'message' => $result['message'],
        ]);
    }

    /**
     * Step 2.3 & 3.5: Organizer action "استرجاع الموعد".
     */
    public function reclaimOccurrence(Tournament $tournament, \App\Domains\Booking\Models\TerrainBookingOccurrence $occurrence): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $result = $this->leagueAssignment->reclaimOccurrence($tournament, $occurrence);

        return response()->json([
            'data' => $result['occurrence'],
            'message' => $result['message'],
        ]);
    }

    /**
     * Step 2.1: Move borrowed match to an unused slot belonging to one of its two teams.
     */
    public function moveToOwnSlot(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $validated = $request->validate([
            'booking_id' => 'required|integer|exists:terrain_bookings,id',
            'date' => 'nullable|date',
        ], [
            'booking_id.required' => 'يرجى اختيار الموعد المراد النقل إليه',
        ]);

        $result = $this->leagueAssignment->moveToOwnSlot(
            $tournament,
            $fixture,
            $validated['booking_id'],
            $validated['date'] ?? null
        );

        return response()->json([
            'data' => $result['fixture'],
            'message' => $result['message'],
        ]);
    }

    /**
     * Step 3.1 & 3.2: Get comprehensive unused slot pool.
     */
    public function unusedSlotPool(Request $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        // Check and notify finished teams if any
        $this->leagueAssignment->checkAndNotifyFinishedTeams($tournament);

        $fixtureId = $request->integer('fixture_id');
        $fixture = $fixtureId ? Fixture::find($fixtureId) : null;

        $result = $this->leagueAssignment->unusedSlotPool($tournament, $fixture);

        return response()->json([
            'data' => $result,
        ]);
    }

    /**
     * Step 3.4: Quick assign nearest available slot to a pending/postponed match.
     */
    public function quickAssign(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $validated = $request->validate([
            'booking_id' => 'required|integer|exists:terrain_bookings,id',
            'date' => 'required|date',
            'host_team_id' => 'nullable|integer|exists:teams,id',
        ], [
            'booking_id.required' => 'معرف الحجز مطلوب',
            'date.required' => 'تاريخ الحجز مطلوب',
        ]);

        $result = $this->leagueAssignment->quickAssign(
            $tournament,
            $fixture,
            $validated['booking_id'],
            $validated['date'],
            $validated['host_team_id'] ?? null
        );

        return response()->json([
            'data' => $result['fixture'],
            'message' => $result['message'],
        ]);
    }

    /**
     * Step 2.3: List occurrences released to this tournament.
     */
    public function releasedOccurrences(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $occurrences = \App\Domains\Booking\Models\TerrainBookingOccurrence::query()
            ->where('status', \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_RELEASED)
            ->where('metadata->tournament_id', $tournament->id)
            ->with(['stadium', 'booking.team'])
            ->orderBy('occurrence_date')
            ->orderBy('start_time')
            ->get();

        return response()->json([
            'data' => $occurrences,
        ]);
    }
}
