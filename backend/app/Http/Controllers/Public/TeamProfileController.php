<?php

namespace App\Http\Controllers\Public;

use App\Domains\Shared\Base\Controller;
use App\Domains\Team\Models\Team;
use Illuminate\Http\JsonResponse;

class TeamProfileController extends Controller
{
    public function show(Team $team): JsonResponse
    {
        if ($team->visibility !== 'public') {
            return response()->json([
                'team' => [
                    'id' => $team->id,
                    'name' => $team->name,
                    'visibility' => $team->visibility,
                ],
            ]);
        }

        $team->load('manager');

        return response()->json([
            'team' => [
                'id' => $team->id,
                'name' => $team->name,
                'city' => $team->city,
                'category' => $team->category,
                'level' => $team->level,
                'founded_year' => $team->founded_year,
                'member_count' => $team->member_count,
                'max_squad_size' => $team->max_squad_size,
                'association_name' => $team->association_name,
                'description' => $team->description,
                'primary_color' => $team->primary_color,
                'secondary_color' => $team->secondary_color,
                'logo_url' => $team->logo_url,
                'logo_thumbnail_url' => $team->logo_thumbnail_url,
                'cover_image_url' => $team->cover_image_url,
                'players_count' => $team->players()->count(),
                'points' => $team->points,
                'matches_played' => $team->matches_played,
                'wins' => $team->wins,
                'draws' => $team->draws,
                'losses' => $team->losses,
                'goals_for' => $team->goals_for,
                'goals_against' => $team->goals_against,
                'goal_difference' => $team->goal_difference,
                'created_at' => $team->created_at,
                'manager' => $team->manager ? [
                    'id' => $team->manager->id,
                    'name' => $team->manager->name,
                    'avatar_url' => $team->manager->avatar_url,
                    'city' => $team->manager->city,
                ] : null,
            ],
        ]);
    }
}