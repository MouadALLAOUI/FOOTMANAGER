<?php

namespace App\Domains\Device\Services;

use App\Domains\Device\Models\Device;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class DeviceService
{
    /**
     * Register (or refresh) a push token for a user.
     *
     * Tokens are uniquely indexed, so if the same device token shows up under a
     * different account (device reused / app re-login) it is re-assigned to the
     * authenticated user rather than duplicated.
     */
    public function register(User $user, string $token, string $platform): Device
    {
        return Device::query()->updateOrCreate(
            ['token' => trim($token)],
            [
                'user_id' => $user->id,
                'platform' => in_array($platform, ['ios', 'android'], true) ? $platform : 'android',
                'last_used_at' => now(),
            ],
        );
    }

    public function unregisterById(User $user, int $deviceId): bool
    {
        return (bool) Device::query()
            ->where('id', $deviceId)
            ->where('user_id', $user->id)
            ->delete();
    }

    public function unregisterByToken(User $user, string $token): int
    {
        return Device::query()
            ->where('user_id', $user->id)
            ->where('token', trim($token))
            ->delete();
    }

    public function devicesFor(User $user): Collection
    {
        return $user->devices()->orderByDesc('last_used_at')->get();
    }

    /**
     * Active push tokens for a user that should receive a given notification.
     */
    public function tokensForUser(int $userId): array
    {
        return Device::query()
            ->where('user_id', $userId)
            ->orderByDesc('last_used_at')
            ->pluck('token')
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Drop every device row carrying a now-invalid token (DeviceNotRegistered).
     */
    public function forgetToken(string $token): void
    {
        Device::query()->where('token', $token)->delete();
    }
}