<?php

namespace App\Domains\Shared\Support;

use Illuminate\Support\Facades\Cache;

class SocialCache
{
    public static function teamPage(int $teamId): string
    {
        return "social:team-page:{$teamId}";
    }

    public static function stadiumReviews(int $stadiumId): string
    {
        return "social:stadium-reviews:{$stadiumId}";
    }

    public static function stadiumStats(int $stadiumId): string
    {
        return "social:stadium-stats:{$stadiumId}";
    }

    public static function playerReviews(int $playerId): string
    {
        return "social:player-reviews:{$playerId}";
    }

    public static function playerStats(int $playerId): string
    {
        return "social:player-stats:{$playerId}";
    }

    public static function feedPopular(): string
    {
        return 'social:feed:popular';
    }

    public static function feedFollowing(int $userId): string
    {
        return "social:feed:following:{$userId}";
    }

    public static function popularSearches(): string
    {
        return 'social:search:popular';
    }

    public static function reactions(string $targetType, int $targetId): string
    {
        return "social:reactions:{$targetType}:{$targetId}";
    }

    public static function flush(string $type, int $id): void
    {
        Cache::forget(self::teamPage($id));
        Cache::forget(self::stadiumReviews($id));
        Cache::forget(self::stadiumStats($id));
        Cache::forget(self::playerReviews($id));
        Cache::forget(self::playerStats($id));
        Cache::forget(self::feedPopular());
        Cache::forget(self::popularSearches());
        Cache::forget(self::reactions($type, $id));
    }

    public static function flushFeed(): void
    {
        Cache::forget(self::feedPopular());
    }

    public static function flushReactions(string $targetType, int $targetId): void
    {
        Cache::forget(self::reactions($targetType, $targetId));
    }
}
