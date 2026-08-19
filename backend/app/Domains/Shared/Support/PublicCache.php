<?php

namespace App\Domains\Shared\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Cache keys + invalidation for the legacy public read endpoints.
 *
 * Per-segment version counters let a mutation invalidate exactly the segment
 * it touches (team leaderboard, player leaderboard, facilities, settings,
 * terrains) without flushing unrelated cached data.
 */
class PublicCache
{
    private const VERSION_PREFIX = 'legacy:cache:v:';

    public static function teamLeaderboard(int $page, ?string $category): string
    {
        return sprintf('legacy:team-leaderboard:v%d:%d:%s', self::segment('team'), $page, $category ?: '*');
    }

    public static function playerLeaderboard(int $page, ?string $position, ?string $city): string
    {
        return sprintf('legacy:player-leaderboard:v%d:%d:%s:%s', self::segment('player'), $page, $position ?: '*', $city ?: '*');
    }

    public static function facilities(): string
    {
        return sprintf('legacy:facilities:v%d', self::segment('facilities'));
    }

    public static function settings(): string
    {
        return sprintf('legacy:settings:v%d', self::segment('settings'));
    }

    public static function moduleMaintenance(): string
    {
        return sprintf('legacy:module-maintenance:v%d', self::segment('module_maintenance'));
    }

    public static function pageMaintenance(): string
    {
        return sprintf('legacy:page-maintenance:v%d', self::segment('page_maintenance'));
    }

    public static function stadiums(): string
    {
        return sprintf('legacy:stadiums:v%d', self::segment('terrains'));
    }

    public static function terrains(?string $type, ?string $city, ?string $format): string
    {
        return sprintf('legacy:terrains:v%d:%s:%s:%s', self::segment('terrains'), $type ?: '*', $city ?: '*', $format ?: '*');
    }

    public static function flushTeamLeaderboard(): void
    {
        self::bump('team');
    }

    public static function flushPlayerLeaderboard(): void
    {
        self::bump('player');
    }

    public static function flushFacilities(): void
    {
        self::bump('facilities');
    }

    public static function flushSettings(): void
    {
        self::bump('settings');
    }

    public static function flushModuleMaintenance(): void
    {
        self::bump('module_maintenance');
    }

    public static function flushPageMaintenance(): void
    {
        self::bump('page_maintenance');
    }

    public static function flushTerrains(): void
    {
        self::bump('terrains');
    }

    private static function segment(string $name): int
    {
        return Cache::rememberForever(self::VERSION_PREFIX.$name, fn () => 1);
    }

    private static function bump(string $name): void
    {
        Cache::put(self::VERSION_PREFIX.$name, self::segment($name) + 1);
    }
}
