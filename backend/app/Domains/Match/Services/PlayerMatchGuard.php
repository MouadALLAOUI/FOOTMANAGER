<?php

namespace App\Domains\Match\Services;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Match\Models\PlayerMatchRequest;

/**
 * Guards player assignments to matches: capacity and time conflicts.
 */
class PlayerMatchGuard
{
    public const MATCH_WINDOW_HOURS = 2;

    public static function joinedCount(MatchRequest $match): int
    {
        return PlayerMatchRequest::query()
            ->where('match_request_id', $match->id)
            ->where('status', 'accepted')
            ->count();
    }

    public static function isFull(MatchRequest $match): bool
    {
        if (! $match->needs_players) {
            return false;
        }

        return static::joinedCount($match) >= (int) ($match->players_needed ?? 0);
    }

    /**
     * Whether the player is already accepted in another match that overlaps
     * the given match's time window.
     */
    public static function hasTimeConflict(int $playerId, MatchRequest $match): bool
    {
        $window = $match->match_datetime;
        if (! $window) {
            return false;
        }

        $start = $window->copy()->subHours(static::MATCH_WINDOW_HOURS);
        $end = $window->copy()->addHours(static::MATCH_WINDOW_HOURS);

        return PlayerMatchRequest::query()
            ->where('player_id', $playerId)
            ->where('status', 'accepted')
            ->where('match_request_id', '!=', $match->id)
            ->whereHas('matchRequest', function ($q) use ($start, $end) {
                $q->where('status', '!=', 'cancelled')
                    ->where('match_datetime', '>', $start)
                    ->where('match_datetime', '<', $end);
            })
            ->exists();
    }
}
