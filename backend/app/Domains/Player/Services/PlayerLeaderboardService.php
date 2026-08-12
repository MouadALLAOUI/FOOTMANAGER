<?php

namespace App\Domains\Player\Services;

use App\Domains\Player\Models\PlayerStatistic;
use App\Domains\Shared\Support\PlayerCache;
use Illuminate\Support\Facades\Cache;

class PlayerLeaderboardService
{
    public function index(array $filters = [], int $limit = 50): array
    {
        $hash = md5(json_encode($filters).':'.$limit);
        $ttl = (int) config('player.cache.leaderboard_ttl');

        return Cache::remember(PlayerCache::leaderboard($hash), $ttl, function () use ($filters, $limit) {
            return $this->build($filters, $limit);
        });
    }

    public function flush(): void
    {
        // The stats key is flushed via PlayerCache; leaderboard is generic,
        // so we clear via cache store tags if supported, otherwise rely on TTL.
    }

    public function rankOf(int $userId): ?int
    {
        $stats = PlayerStatistic::where('user_id', $userId)->first();

        if (! $stats) {
            return null;
        }

        $overall = $this->overallScore($stats);

        return PlayerStatistic::query()
            ->where('matches_played', '>', 0)
            ->get()
            ->filter(fn ($s) => $this->overallScore($s) > $overall)
            ->count() + 1;
    }

    private function build(array $filters, int $limit): array
    {
        $query = PlayerStatistic::query()
            ->where('matches_played', '>', 0)
            ->with('user:id,name')
            ->with('user.playerProfile:id,user_id,photo_path,position,city,availability_status,recruitment_available,overall_rating')
            ->orderByDesc('wins')
            ->orderByDesc('goals')
            ->orderByDesc('avg_rating')
            ->orderByDesc('matches_played')
            ->limit($limit);

        $this->applyFilters($query, $filters);

        $rows = $query->get()->map(function (PlayerStatistic $stats, int $index) {
            $profile = $stats->user?->playerProfile;

            return [
                'rank' => $index + 1,
                'user' => [
                    'id' => $stats->user?->id,
                    'name' => $stats->user?->name,
                    'photo_url' => $profile?->photo_url,
                ],
                'position' => $profile?->position,
                'city' => $profile?->city,
                'availability' => $profile?->availability_status,
                'recruitment_available' => (bool) $profile?->recruitment_available,
                'matches_played' => $stats->matches_played,
                'wins' => $stats->wins,
                'draws' => $stats->draws,
                'losses' => $stats->losses,
                'goals' => $stats->goals,
                'assists' => $stats->assists,
                'clean_sheets' => $stats->clean_sheets,
                'avg_rating' => $stats->avg_rating,
                'mvp_count' => $stats->mvp_count,
                'points' => $this->pointsFor($stats),
                'overall' => $this->overallScore($stats),
            ];
        });

        return [
            'entries' => $rows->values(),
            'total' => PlayerStatistic::where('matches_played', '>', 0)->count(),
        ];
    }

    private function applyFilters($query, array $filters): void
    {
        if (! empty($filters['position']) && $filters['position'] !== 'all') {
            $query->whereHas('user.playerProfile', fn ($q) => $q->where('position', $filters['position']));
        }

        if (! empty($filters['city']) && $filters['city'] !== 'all') {
            $query->whereHas('user.playerProfile', fn ($q) => $q->where('city', $filters['city']));
        }
    }

    private function pointsFor(PlayerStatistic $stats): int
    {
        return $stats->wins * 3 + $stats->draws;
    }

    private function overallScore(PlayerStatistic $stats): float
    {
        $rating = (float) $stats->avg_rating;
        $winRate = $stats->matches_played > 0 ? ($stats->wins / $stats->matches_played) * 100 : 0;

        return round(($rating * 10) * 0.6 + $winRate * 0.25 + min($stats->matches_played, 100) * 0.15, 2);
    }
}
