<?php

namespace App\Http\Controllers\Manager;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Services\TournamentSquadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TournamentSquadController extends Controller
{
    public function __construct(private readonly TournamentSquadService $squad)
    {
    }

    public function index(Request $request, Tournament $tournament): JsonResponse
    {
        $team = app(\App\Domains\Shared\Support\CurrentTeamResolver::class)->for($request->user());

        if (! $team) {
            throw new DomainException('يجب إنشاء ملف الفريق أولاً', 422);
        }

        return response()->json($this->squad->squad($tournament, $team));
    }

    public function toggle(Request $request, Tournament $tournament, int $playerId): JsonResponse
    {
        $team = app(\App\Domains\Shared\Support\CurrentTeamResolver::class)->for($request->user());

        if (! $team) {
            throw new DomainException('يجب إنشاء ملف الفريق أولاً', 422);
        }

        return response()->json($this->squad->toggle($tournament, $team, $playerId));
    }
}