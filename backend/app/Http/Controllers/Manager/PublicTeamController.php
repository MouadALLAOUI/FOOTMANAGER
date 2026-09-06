<?php

namespace App\Http\Controllers\Manager;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Shared\Base\Controller;
use App\Domains\Team\Models\Team;
use Illuminate\Http\JsonResponse;

class PublicTeamController extends Controller
{
    public function show(int $id): JsonResponse
    {
        $team = Team::with([
            'primaryStadium',
            'manager:id,name,status,phone,email',
            'formation.players.player:id,name,position,number,photo_path,photo_thumbnail_path',
            'formation.captain:id,name,number',
            'formation.viceCaptain:id,name,number',
            'players' => fn ($q) => $q->where('status', 'active')->orderBy('number'),
        ])->findOrFail($id);

        if ($team->manager && $team->manager->status !== 'approved') {
            return response()->json(['message' => 'هذا الحساب غير متاح'], 404);
        }

        $recentMatches = MatchRequest::with(['hostTeam', 'opponentTeam', 'stadium'])
            ->where('status', 'completed')
            ->where(function ($q) use ($id) {
                $q->where('host_team_id', $id)
                    ->orWhere('opponent_team_id', $id);
            })
            ->latest('match_datetime')
            ->limit(5)
            ->get();

        return response()->json([
            'team' => $team,
            'recent_matches' => $recentMatches,
        ]);
    }
}
