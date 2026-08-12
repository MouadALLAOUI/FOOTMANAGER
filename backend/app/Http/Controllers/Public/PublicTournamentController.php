<?php

namespace App\Http\Controllers\Public;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Shared\Base\Controller;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Resources\TournamentDetailResource;
use App\Domains\Tournament\Resources\TournamentFixtureResource;
use App\Domains\Tournament\Resources\TournamentResource;
use App\Domains\Tournament\Resources\TournamentTeamResource;
use App\Domains\Tournament\Services\TournamentBracketService;
use App\Domains\Tournament\Services\TournamentDrawService;
use App\Domains\Tournament\Services\TournamentStandingsService;
use App\Domains\Tournament\Services\TournamentStatisticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicTournamentController extends Controller
{
    public function __construct(
        private readonly TournamentDrawService $draw,
        private readonly TournamentStandingsService $standings,
        private readonly TournamentBracketService $bracket,
        private readonly TournamentStatisticsService $statistics,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Tournament::query()
            ->with('organizer')
            ->whereIn('status', ['published', 'finished'])
            ->latest();

        $perPage = min(max((int) $request->query('per_page', 20), 1), 50);
        $tournaments = $query->paginate($perPage);

        return response()->json([
            'data' => TournamentResource::collection($tournaments),
            'meta' => [
                'current_page' => $tournaments->currentPage(),
                'per_page' => $tournaments->perPage(),
                'total' => $tournaments->total(),
                'last_page' => $tournaments->lastPage(),
            ],
        ]);
    }

    public function show(Tournament $tournament): JsonResponse
    {
        $this->abortIfPrivate($tournament);

        $tournament->load(['organizer', 'stadium'])->loadCount('tournamentTeams');

        return response()->json(['data' => new TournamentDetailResource($tournament)]);
    }

    public function fixtures(Tournament $tournament): AnonymousResourceCollection
    {
        $this->abortIfPrivate($tournament);

        $fixtures = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->with(['round', 'group', 'homeTeam', 'awayTeam', 'stadium', 'match'])
            ->orderBy('scheduled_at')
            ->orderBy('id')
            ->get();

        return TournamentFixtureResource::collection($fixtures);
    }

    public function teams(Tournament $tournament): AnonymousResourceCollection
    {
        $this->abortIfPrivate($tournament);

        $teams = $tournament->tournamentTeams()
            ->with(['team', 'group'])
            ->get();

        return TournamentTeamResource::collection($teams);
    }

    public function draw(Tournament $tournament): JsonResponse
    {
        $this->abortIfPrivate($tournament);

        return response()->json(['data' => $this->draw->currentDraw($tournament)]);
    }

    public function standings(Tournament $tournament): JsonResponse
    {
        $this->abortIfPrivate($tournament);

        return response()->json(['data' => $this->standings->standings($tournament)]);
    }

    public function bracket(Tournament $tournament): JsonResponse
    {
        $this->abortIfPrivate($tournament);

        return response()->json(['data' => $this->bracket->bracket($tournament)]);
    }

    public function statistics(Tournament $tournament): JsonResponse
    {
        $this->abortIfPrivate($tournament);

        return response()->json(['data' => $this->statistics->statistics($tournament)]);
    }

    private function abortIfPrivate(Tournament $tournament): void
    {
        abort_unless(in_array($tournament->status, ['published', 'finished'], true), 404);
    }
}
