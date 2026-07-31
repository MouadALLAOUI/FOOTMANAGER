<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Models\MatchRequest;
use App\Models\Team;
use Illuminate\Http\JsonResponse;

class PublicTeamController extends Controller
{
    public function show(int $id): JsonResponse
    {
        $team = Team::with(['primaryStadium', 'manager:id,name,phone,status,is_whatsapp'])
            ->findOrFail($id);

        if ($team->manager->status !== 'approved') {
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
