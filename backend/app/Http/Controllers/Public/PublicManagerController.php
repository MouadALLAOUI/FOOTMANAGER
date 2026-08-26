<?php

namespace App\Http\Controllers\Public;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Controller;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicManagerController extends Controller
{
    public function show(Request $request, int $managerId): JsonResponse
    {
        $manager = User::where('id', $managerId)
            ->where('role', 'manager')
            ->where('status', 'approved')
            ->select('id', 'name', 'avatar_url', 'city', 'created_at')
            ->first();

        if (! $manager) {
            return response()->json(['message' => 'المسير غير موجود'], 404);
        }

        $team = Team::select('id', 'name', 'city', 'category', 'logo_url', 'created_at')
            ->where('manager_id', $manager->id)
            ->first();

        $playersCount = 0;
        if ($team) {
            $playersCount = Player::where('team_id', $team->id)->count();
        }

        return response()->json([
            'manager' => [
                'id' => $manager->id,
                'name' => $manager->name,
                'avatar_url' => $manager->avatar_url,
                'city' => $manager->city,
                'joined_at' => $manager->created_at,
            ],
            'team' => $team ? [
                'id' => $team->id,
                'name' => $team->name,
                'city' => $team->city,
                'category' => $team->category,
                'logo_url' => $team->logo_url,
                'created_at' => $team->created_at,
                'players_count' => $playersCount,
            ] : null,
        ]);
    }
}
