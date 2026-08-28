<?php

namespace App\Http\Controllers\Public;

use App\Domains\Shared\Base\Controller;
use App\Domains\Stadium\Models\Stadium;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class TerrainOwnerProfileController extends Controller
{
    public function show(int $ownerId): JsonResponse
    {
        $owner = User::where('id', $ownerId)
            ->where('role', 'terrain_owner')
            ->where('status', 'approved')
            ->select('id', 'name', 'avatar_path', 'avatar_thumbnail_path', 'city', 'created_at')
            ->first();

        if (! $owner) {
            return response()->json(['message' => 'صاحب الأرض غير موجود'], 404);
        }

        $terrains = Stadium::where('owner_id', $owner->id)
            ->select('id', 'name', 'city', 'type', 'player_format', 'is_available', 'is_open', 'price_per_hour')
            ->orderBy('name')
            ->get();

        return response()->json([
            'owner' => [
                'id' => $owner->id,
                'name' => $owner->name,
                'avatar_url' => $owner->avatar_url,
                'city' => $owner->city,
                'joined_at' => $owner->created_at,
                'terrains_count' => $terrains->count(),
                'terrains' => $terrains->map(fn (Stadium $t) => [
                    'id' => $t->id,
                    'name' => $t->name,
                    'city' => $t->city,
                    'type' => $t->type,
                    'player_format' => $t->player_format,
                    'is_available' => (bool) $t->is_available,
                    'is_open' => (bool) $t->is_open,
                    'price_per_hour' => $t->price_per_hour,
                ])->values(),
            ],
        ]);
    }
}