<?php

namespace App\Domains\Shared\Support;

use Illuminate\Support\Facades\Cache;

class TeamCache
{
    public static function dashboard(int $teamId): string
    {
        return "team:dashboard:{$teamId}";
    }

    public static function statistics(int $teamId): string
    {
        return "team:statistics:{$teamId}";
    }

    public static function fixtures(int $teamId): string
    {
        return "team:fixtures:{$teamId}";
    }

    public static function flushTeam(int $teamId): void
    {
        Cache::forget(self::dashboard($teamId));
        Cache::forget(self::statistics($teamId));
        Cache::forget(self::fixtures($teamId));
    }
}
