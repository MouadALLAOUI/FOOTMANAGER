<?php

namespace App\Http\Controllers\Public;

use App\Domains\Shared\Base\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class CommitteeMemberProfileController extends Controller
{
    public function show(int $memberId): JsonResponse
    {
        $member = User::where('id', $memberId)
            ->where('role', 'committee')
            ->where('status', 'approved')
            ->select('id', 'name', 'avatar_path', 'avatar_thumbnail_path', 'city', 'created_at')
            ->first();

        if (! $member) {
            return response()->json(['message' => 'عضو اللجنة غير موجود'], 404);
        }

        return response()->json([
            'committee' => [
                'id' => $member->id,
                'name' => $member->name,
                'avatar_url' => $member->avatar_url,
                'city' => $member->city,
                'joined_at' => $member->created_at,
            ],
        ]);
    }
}