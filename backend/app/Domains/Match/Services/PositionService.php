<?php

namespace App\Domains\Match\Services;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Match\Models\PlayerMatchRequest;

class PositionService
{
    public const VALID_POSITIONS = ['goalkeeper', 'defender', 'midfielder', 'forward'];

    public static function getPositionAvailability(MatchRequest $match): array
    {
        $required = $match->positions_needed;

        if (! is_array($required) || empty($required)) {
            return [];
        }

        $accepted = PlayerMatchRequest::query()
            ->where('match_request_id', $match->id)
            ->where('status', 'accepted')
            ->whereNotNull('position')
            ->selectRaw('position, count(*) as filled')
            ->groupBy('position')
            ->pluck('filled', 'position');

        $result = [];
        foreach ($required as $pos => $count) {
            $filled = (int) ($accepted[$pos] ?? 0);
            $result[$pos] = [
                'required' => (int) $count,
                'filled' => $filled,
                'available' => max((int) $count - $filled, 0),
            ];
        }

        return $result;
    }

    public static function isPositionFull(MatchRequest $match, string $position): bool
    {
        $availability = static::getPositionAvailability($match);

        if (! isset($availability[$position])) {
            return true;
        }

        return $availability[$position]['available'] <= 0;
    }

    public static function hasPositionRequirements(MatchRequest $match): bool
    {
        return is_array($match->positions_needed) && ! empty($match->positions_needed);
    }

    public static function validatePositionsNeeded(array $positions): bool
    {
        if (empty($positions)) {
            return true;
        }

        foreach (array_keys($positions) as $key) {
            if (! in_array($key, static::VALID_POSITIONS, true)) {
                return false;
            }
        }

        foreach ($positions as $count) {
            if (! is_int($count) || $count < 0 || $count > 50) {
                return false;
            }
        }

        return true;
    }

    public static function totalRequired(array $positionsNeeded): int
    {
        return array_sum($positionsNeeded);
    }
}
