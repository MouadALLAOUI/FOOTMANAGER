<?php

namespace App\Domains\Player\Controllers;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Shared\Base\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $teamId = $user->rosterPlayer?->team_id;

        $upcomingMatches = MatchRequest::query()
            ->where('status', 'accepted')
            ->where('match_datetime', '>=', now())
            ->where(function ($q) use ($teamId) {
                if ($teamId) {
                    $q->where('host_team_id', $teamId)->orWhere('opponent_team_id', $teamId);
                }
            })
            ->with('hostTeam:id,name', 'opponentTeam:id,name', 'stadium:id,name,city')
            ->orderBy('match_datetime')
            ->limit($request->integer('limit', 10))
            ->get()
            ->map(function (MatchRequest $match) {
                return [
                    'type' => 'match',
                    'title' => $match->hostTeam?->name.' vs '.$match->opponentTeam?->name,
                    'match_datetime' => $match->match_datetime?->toIso8601String(),
                    'stadium' => $match->stadium?->name,
                    'city' => $match->stadium?->city,
                    'status' => $match->status,
                ];
            });

        $openMatches = MatchRequest::query()
            ->where('status', 'open')
            ->where('match_datetime', '>=', now())
            ->with('hostTeam:id,name', 'stadium:id,name,city')
            ->orderBy('match_datetime')
            ->limit($request->integer('open_limit', 10))
            ->get()
            ->map(function (MatchRequest $match) {
                return [
                    'type' => 'open_match',
                    'title' => $match->hostTeam?->name,
                    'match_datetime' => $match->match_datetime?->toIso8601String(),
                    'stadium' => $match->stadium?->name,
                    'city' => $match->stadium?->city,
                    'price_per_player' => $match->price_per_player,
                    'status' => $match->status,
                ];
            });

        return response()->json([
            'data' => [
                'upcoming_matches' => $upcomingMatches,
                'open_matches' => $openMatches,
            ],
        ]);
    }
}
