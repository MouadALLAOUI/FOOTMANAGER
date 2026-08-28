<?php

namespace App\Http\Controllers\Public;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Controller;
use Illuminate\Http\JsonResponse;

class PlayerProfileController extends Controller
{
    public function show(Player $player): JsonResponse
    {
        $player->load(['team', 'user', 'playerProfile']);
        $profile = $player->playerProfile;

        return response()->json([
            'player' => [
                'id' => $player->id,
                'name' => $player->name,
                'position' => $player->position,
                'preferred_position' => $player->preferred_position,
                'number' => $player->number,
                'role' => $player->role,
                'is_essential' => $player->is_essential,
                'status' => $player->status,
                'preferred_foot' => $player->preferred_foot,
                'height_cm' => $player->height_cm,
                'weight_kg' => $player->weight_kg,
                'joined_at' => $player->joined_at,
                'avatar_url' => $profile?->photo_url ?? $player->user?->avatar_url,
                'age' => $profile?->age,
                'skill_level' => $profile?->skill_level,
                'preferred_formats' => $profile?->preferred_formats ?? [],
                'team' => $player->team ? [
                    'id' => $player->team->id,
                    'name' => $player->team->name,
                    'city' => $player->team->city,
                    'category' => $player->team->category,
                    'logo_url' => $player->team->logo_url,
                ] : null,
            ],
        ]);
    }
}