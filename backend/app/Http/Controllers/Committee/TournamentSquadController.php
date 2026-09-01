<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\ArabicPlural;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use App\Domains\Tournament\Services\TournamentSquadService;
use App\Http\Requests\Committee\StoreBulkSquadPlayersRequest;
use App\Http\Requests\Committee\UpdateSquadPlayerRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TournamentSquadController extends Controller
{
    public function __construct(private readonly TournamentSquadService $squad)
    {
    }

    public function index(Tournament $tournament, Team $team): JsonResponse
    {
        $this->assertInTournament($tournament, $team);

        return response()->json($this->squad->squad($tournament, $team));
    }

    public function toggle(Tournament $tournament, Team $team, int $playerId): JsonResponse
    {
        $this->assertInTournament($tournament, $team);

        return response()->json($this->squad->toggle($tournament, $team, $playerId));
    }

    public function store(Request $request, Tournament $tournament, Team $team): JsonResponse
    {
        $this->assertInTournament($tournament, $team);

        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'number' => 'nullable|integer|min:0|max:99',
            'position' => 'nullable|string|max:100',
            'force' => 'sometimes|boolean',
        ]);

        $result = $this->squad->addPlayer($tournament, $team, $validated);

        return response()->json([
            'created' => $result['created'],
            'player' => $result['player'],
            'duplicates' => $result['duplicates'],
            'squad_count' => $result['squad_count'],
            'max' => $result['max'],
            'message' => $result['created']
                ? 'تمت إضافة اللاعب إلى قائمة البطولة'
                : 'يوجد لاعب بنفس الاسم',
        ], $result['created'] ? 201 : 200);
    }

    public function storeBulk(StoreBulkSquadPlayersRequest $request, Tournament $tournament, Team $team): JsonResponse
    {
        $this->assertInTournament($tournament, $team);

        $result = $this->squad->storeBulk($tournament, $team, $request->validated('players'));

        return response()->json($result + [
            'message' => 'تمت إضافة '.ArabicPlural::players($result['created_count']).' إلى قائمة الفريق',
        ], 201);
    }

    public function updatePlayer(UpdateSquadPlayerRequest $request, Tournament $tournament, Team $team, int $playerId): JsonResponse
    {
        $this->assertInTournament($tournament, $team);

        $player = Player::query()->findOrFail($playerId);

        return response()->json($this->squad->updatePlayer($tournament, $team, $player, $request->validated()) + [
            'message' => 'تم تحديث اللاعب',
        ]);
    }

    private function assertInTournament(Tournament $tournament, Team $team): void
    {
        abort_unless(
            TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('team_id', $team->id)
                ->exists(),
            404,
        );
    }
}