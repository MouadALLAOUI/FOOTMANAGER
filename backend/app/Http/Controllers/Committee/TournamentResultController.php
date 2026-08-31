<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Resources\TournamentFixtureResource;
use App\Domains\Tournament\Resources\TournamentResultResource;
use App\Domains\Tournament\Services\TournamentResultService;
use App\Domains\Tournament\Services\TournamentSuspensionService;
use App\Http\Requests\Committee\StoreFixtureResultRequest;
use App\Http\Requests\Committee\UpdateFixtureResultRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TournamentResultController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly TournamentResultService $results,
        private readonly TournamentSuspensionService $suspensions,
    ) {}

    public function store(StoreFixtureResultRequest $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $this->assertBelongsToTournament($tournament, $fixture);

        $fixture = $this->results->enterResult($fixture, $request->validated(), $request->user()->id);

        return response()->json([
            'data' => new TournamentFixtureResource($fixture->load(['round', 'group', 'homeTeam', 'awayTeam', 'stadium', 'match'])),
            'message' => 'تم تسجيل النتيجة',
        ]);
    }

    public function show(Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $this->assertBelongsToTournament($tournament, $fixture);

        $fixture = $this->results->resultDetail($fixture);

        return response()->json([
            'data' => (new TournamentResultResource($fixture))
                ->additional(['suspended_players' => $this->suspensions->suspendedFor($fixture)]),
        ]);
    }

    public function update(UpdateFixtureResultRequest $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $this->assertBelongsToTournament($tournament, $fixture);

        $fixture = $this->results->updateResult($fixture, $request->validated(), $request->user()->id);
        $fixture = $this->results->resultDetail($fixture);

        return response()->json([
            'data' => (new TournamentResultResource($fixture))
                ->additional(['suspended_players' => $this->suspensions->suspendedFor($fixture)]),
            'message' => 'تم تحديث النتيجة',
        ]);
    }

    public function start(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $this->assertBelongsToTournament($tournament, $fixture);

        $fixture = $this->results->start($fixture, $request->user()->id);

        return response()->json([
            'data' => new TournamentFixtureResource($fixture->load(['round', 'group', 'homeTeam', 'awayTeam', 'stadium', 'match'])),
            'message' => 'تم بدء المباراة',
        ]);
    }

    public function startSecondHalf(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $this->assertBelongsToTournament($tournament, $fixture);

        $fixture = $this->results->startSecondHalf($fixture, $request->user()->id);

        return response()->json([
            'data' => new TournamentFixtureResource($fixture->load(['round', 'group', 'homeTeam', 'awayTeam', 'stadium', 'match'])),
            'message' => 'تم بدء الشوط الثاني',
        ]);
    }

    public function destroy(Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $this->assertBelongsToTournament($tournament, $fixture);

        $this->results->undoResult($fixture);

        return response()->json(['message' => 'تم التراجع عن النتيجة']);
    }

    private function assertBelongsToTournament(Tournament $tournament, Fixture $fixture): void
    {
        if ((int) $tournament->competition_id !== (int) $fixture->competition_id
            || (int) $tournament->season_id !== (int) $fixture->season_id) {
            throw new DomainException('المباراة لا تنتمي إلى هذه البطولة', 404);
        }
    }
}
