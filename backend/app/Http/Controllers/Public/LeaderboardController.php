<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaderboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Team::with(['manager:id,name', 'primaryStadium:id,name,city'])
            ->select([
                'id', 'name', 'logo_path', 'logo_url', 'category',
                'points', 'matches_played', 'wins', 'draws', 'losses',
                'goals_for', 'goals_against', 'goal_difference',
                'primary_color', 'secondary_color', 'member_count',
                'manager_id', 'primary_stadium_id',
            ])
            ->whereHas('manager', function ($q) {
                $q->where('status', 'approved');
            });

        if ($request->filled('category')) {
            $query->where('category', $request->query('category'));
        }

        $teams = $query
            ->orderByDesc('points')
            ->orderByDesc('goal_difference')
            ->orderByDesc('goals_for')
            ->orderByDesc('wins')
            ->paginate(20);

        return response()->json([
            'teams' => $teams->items(),
            'current_page' => $teams->currentPage(),
            'last_page' => $teams->lastPage(),
            'per_page' => $teams->perPage(),
            'total' => $teams->total(),
        ]);
    }
}
