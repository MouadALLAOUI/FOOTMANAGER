<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Context-aware User serialization.
 *
 * Usage:
 *   new UserResource($user)                         — public: id, name, avatar, city
 *   new UserResource($user, 'self')                 — all fields including phone, email
 *   new UserResource($user, 'team_member')          — id, name, phone, is_whatsapp, avatar
 *   new UserResource($user, 'booking_coordination') — id, name, phone
 *   new UserResource($user, 'admin')                — full model
 */
class UserResource extends JsonResource
{
    public function __construct(
        $resource,
        private readonly string $context = 'public',
    ) {
        parent::__construct($resource);
    }

    public function toArray(Request $request): array
    {
        $user = $this->resource;

        if ($this->context === 'admin') {
            return $user->makeVisible(
                'phone', 'email', 'is_whatsapp', 'email_verified_at',
                'activity_lock_reason', 'activity_locked_by', 'activity_locked_at',
            )->toArray();
        }

        $base = [
            'id' => $user->id,
            'name' => $user->name,
            'avatar_url' => $user->avatar_url,
            'avatar_thumbnail_url' => $user->avatar_thumbnail_url,
        ];

        if ($this->context === 'public') {
            return array_merge($base, [
                'city' => $user->playerProfile?->city,
                'created_at' => $user->created_at,
            ]);
        }

        if ($this->context === 'self') {
            return array_merge($base, [
                'email' => $user->email,
                'phone' => $user->phone,
                'is_whatsapp' => $user->is_whatsapp,
                'role' => $user->role,
                'status' => $user->status,
                'email_verified_at' => $user->email_verified_at,
                'created_at' => $user->created_at,
            ]);
        }

        if ($this->context === 'team_member') {
            return array_merge($base, [
                'phone' => $user->phone,
                'is_whatsapp' => $user->is_whatsapp,
                'role' => $user->role,
            ]);
        }

        if ($this->context === 'booking_coordination') {
            return array_merge($base, [
                'phone' => $user->phone,
            ]);
        }

        if ($this->context === 'match_opponent') {
            return $base;
        }

        return $base;
    }
}
