<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Services\LeagueAssignmentService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TournamentLeagueController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly LeagueAssignmentService $leagueAssignment,
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
    public function capacityCheck(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $result = $this->leagueAssignment->capacityCheck($tournament);

        return response()->json([
            'data' => $result,
        ]);
    }

    /**
     * Automatically schedule Single Round Robin league fixtures into available booking slots.
     */
    public function autoSchedule(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $result = $this->leagueAssignment->autoSchedule($tournament);

        return response()->json([
            'data' => $result,
            'message' => $result['message'],
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
        ], [
            'new_opponent_id.required' => 'معرف الفريق الخصم الجديد مطلوب',
            'new_opponent_id.exists' => 'الفريق المحدد غير موجود',
        ]);

        $result = $this->leagueAssignment->changeOpponent($tournament, $fixture, $validated['new_opponent_id']);

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
}
