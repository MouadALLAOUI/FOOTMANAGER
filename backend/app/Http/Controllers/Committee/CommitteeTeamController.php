<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Shared\Base\Controller;
use App\Domains\Team\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommitteeTeamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $teams = Team::query()
            ->whereHas('manager', fn ($query) => $query->where('role', 'manager')->where('status', 'approved'))
            ->orderBy('name')
            ->get(['id', 'name', 'city', 'logo_path', 'logo_url']);

        return response()->json([
            'data' => $teams->map(fn (Team $team) => [
                'id' => $team->id,
                'name' => $team->name,
                'city' => $team->city,
                'logo_url' => $team->logo_url,
            ])->all(),
        ]);
    }
}
