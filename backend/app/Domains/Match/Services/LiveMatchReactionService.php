<?php

namespace App\Domains\Match\Services;

use App\Domains\Match\Models\FootballMatch;
use Illuminate\Support\Facades\Cache;

class LiveMatchReactionService
{
    public const SUPPORTED_TYPES = [
        'fire',      // 🔥
        'applause',  // 👏
        'football',  // ⚽
        'wow',       // 😮
        'love',      // ❤️
    ];

    /**
     * Get aggregate reaction counts for a match.
     */
    public function getCounts(FootballMatch $match): array
    {
        $countsKey = $this->countsKey($match->id);
        $counts = Cache::get($countsKey);

        if (! is_array($counts)) {
            $counts = array_fill_keys(self::SUPPORTED_TYPES, 0);
            Cache::forever($countsKey, $counts);
        } else {
            foreach (self::SUPPORTED_TYPES as $type) {
                if (! isset($counts[$type])) {
                    $counts[$type] = 0;
                }
            }
        }

        return [
            'counts' => $counts,
            'total' => array_sum($counts),
        ];
    }

    /**
     * Get a specific visitor's active reaction for this match.
     */
    public function getMyReaction(FootballMatch $match, string $visitorId): ?string
    {
        return Cache::get($this->visitorKey($match->id, $visitorId));
    }

    /**
     * React to a match score. Toggle off if already selected, or switch to new reaction.
     */
    public function react(FootballMatch $match, string $visitorId, string $type): array
    {
        if (! in_array($type, self::SUPPORTED_TYPES, true)) {
            throw new \InvalidArgumentException('نوع تفاعل غير مدعوم');
        }

        $countsKey = $this->countsKey($match->id);
        $visitorKey = $this->visitorKey($match->id, $visitorId);

        $counts = Cache::get($countsKey);
        if (! is_array($counts)) {
            $counts = array_fill_keys(self::SUPPORTED_TYPES, 0);
        }

        $currentReaction = Cache::get($visitorKey);

        if ($currentReaction === $type) {
            // Toggle off (remove reaction)
            if (isset($counts[$type]) && $counts[$type] > 0) {
                $counts[$type] = max(0, $counts[$type] - 1);
            }
            Cache::forget($visitorKey);
            $myReaction = null;
        } else {
            // Switching or setting reaction
            if ($currentReaction && isset($counts[$currentReaction]) && $counts[$currentReaction] > 0) {
                $counts[$currentReaction] = max(0, $counts[$currentReaction] - 1);
            }

            $counts[$type] = ($counts[$type] ?? 0) + 1;
            Cache::forever($visitorKey, $type);
            $myReaction = $type;
        }

        Cache::forever($countsKey, $counts);

        return [
            'counts' => $counts,
            'total' => array_sum($counts),
            'my_reaction' => $myReaction,
        ];
    }

    protected function countsKey(int $matchId): string
    {
        return "live_match:reactions:{$matchId}:counts";
    }

    protected function visitorKey(int $matchId, string $visitorId): string
    {
        return "live_match:reactions:{$matchId}:visitor:{$visitorId}";
    }
}
