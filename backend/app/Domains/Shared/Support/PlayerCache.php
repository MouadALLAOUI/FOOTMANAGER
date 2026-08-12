<?php

namespace App\Domains\Shared\Support;

use Illuminate\Support\Facades\Cache;

class PlayerCache
{
    public static function statistics(int $userId): string
    {
        return "player:statistics:{$userId}";
    }

    public static function dashboard(int $userId): string
    {
        return "player:dashboard:{$userId}";
    }

    public static function leaderboard(string $filtersHash): string
    {
        return "player:leaderboard:{$filtersHash}";
    }

    public static function searchProfile(int $userId): string
    {
        return "player:search-profile:{$userId}";
    }

    public static function flush(int $userId): void
    {
        Cache::forget(self::statistics($userId));
        Cache::forget(self::dashboard($userId));
        Cache::forget(self::searchProfile($userId));
    }
}
