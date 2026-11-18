<?php

namespace App\Http\Controllers\Public;

use App\Domains\Shared\Base\Controller;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Services\TournamentTeamJourneyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicTeamJourneyController extends Controller
{
    public function __construct(
        private readonly TournamentTeamJourneyService $journeyService,
    ) {}

    public function show(Request $request, Team $team, ?Tournament $tournament = null): JsonResponse
    {
        $journey = $this->journeyService->journey($team, $tournament);

        return response()->json([
            'data' => $journey,
        ]);
    }
}
