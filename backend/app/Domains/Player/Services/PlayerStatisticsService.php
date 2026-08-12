<?php

namespace App\Domains\Player\Services;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Player\Models\PlayerMatchStat;
use App\Domains\Player\Models\PlayerProfile;
use App\Domains\Player\Models\PlayerStatistic;
use App\Domains\Shared\Support\PlayerCache;
use App\Domains\Shared\Support\PublicCache;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class PlayerStatisticsService
{
    public function for(int $userId): PlayerStatistic
    {
        $ttl = (int) config('player.cache.statistics_ttl');

        return Cache::remember(PlayerCache::statistics($userId), $ttl, function () use ($userId) {
            return $this->aggregateFor($userId);
        });
    }

    public function syncForUser(int $userId): PlayerStatistic
    {
        $stats = $this->aggregateFor($userId);
        $stats->last_synced_at = now();
        $stats->save();

        PlayerCache::flush($userId);
        PublicCache::flushPlayerLeaderboard();

        return $stats;
    }

    public function syncForMatch(MatchRequest $match): void
    {
        $teamPlayerUserIds = $match->teamMatchPlayers()
            ->whereNotNull('player_id')
            ->with('player:id,user_id')
            ->get()
            ->map(fn ($tmp) => $tmp->player?->user_id)
            ->filter()
            ->unique();

        foreach ($teamPlayerUserIds as $userId) {
            $this->syncForUser((int) $userId);
        }

        PlayerCache::flush($match->host_team_id ?? 0);
        PlayerCache::flush($match->opponent_team_id ?? 0);
    }

    public function performance(int $userId, int $limit = 10): Collection
    {
        return PlayerMatchStat::query()
            ->where('user_id', $userId)
            ->where('played', true)
            ->with('matchRequest:id,match_datetime,status,host_score,opponent_score,host_team_id,opponent_team_id')
            ->orderByDesc('match_date')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    public function form(int $userId, int $limit = 5): array
    {
        $recent = PlayerMatchStat::query()
            ->where('user_id', $userId)
            ->whereNotNull('result')
            ->orderByDesc('match_date')
            ->orderByDesc('id')
            ->limit($limit)
            ->pluck('result');

        return $recent->map(function (string $result) {
            return match ($result) {
                PlayerMatchStat::RESULT_WIN => 'W',
                PlayerMatchStat::RESULT_DRAW => 'D',
                default => 'L',
            };
        })->values()->toArray();
    }

    public function careerTotals(int $userId): array
    {
        $totals = DB::table('player_match_stats')
            ->where('user_id', $userId)
            ->selectRaw('COUNT(*) as matches_played')
            ->selectRaw('SUM(CASE WHEN result = ? THEN 1 ELSE 0 END) as wins', [PlayerMatchStat::RESULT_WIN])
            ->selectRaw('SUM(CASE WHEN result = ? THEN 1 ELSE 0 END) as draws', [PlayerMatchStat::RESULT_DRAW])
            ->selectRaw('SUM(CASE WHEN result = ? THEN 1 ELSE 0 END) as losses', [PlayerMatchStat::RESULT_LOSS])
            ->first();

        return [
            'matches_played' => (int) ($totals->matches_played ?? 0),
            'wins' => (int) ($totals->wins ?? 0),
            'draws' => (int) ($totals->draws ?? 0),
            'losses' => (int) ($totals->losses ?? 0),
        ];
    }

    private function aggregateFor(int $userId): PlayerStatistic
    {
        $agg = DB::table('player_match_stats')
            ->where('user_id', $userId)
            ->selectRaw('COUNT(*) as matches_played')
            ->selectRaw('SUM(CASE WHEN result = ? THEN 1 ELSE 0 END) as wins', [PlayerMatchStat::RESULT_WIN])
            ->selectRaw('SUM(CASE WHEN result = ? THEN 1 ELSE 0 END) as draws', [PlayerMatchStat::RESULT_DRAW])
            ->selectRaw('SUM(CASE WHEN result = ? THEN 1 ELSE 0 END) as losses', [PlayerMatchStat::RESULT_LOSS])
            ->selectRaw('SUM(goals) as goals')
            ->selectRaw('SUM(assists) as assists')
            ->selectRaw('SUM(own_goals) as own_goals')
            ->selectRaw('SUM(yellow_cards) as yellow_cards')
            ->selectRaw('SUM(red_cards) as red_cards')
            ->selectRaw('SUM(CASE WHEN clean_sheet = 1 THEN 1 ELSE 0 END) as clean_sheets')
            ->selectRaw('SUM(minutes) as minutes_played')
            ->selectRaw('SUM(rating) as total_rating')
            ->selectRaw('SUM(CASE WHEN rating IS NOT NULL THEN 1 ELSE 0 END) as rating_count')
            ->selectRaw('MAX(rating) as best_match_rating')
            ->selectRaw('SUM(CASE WHEN mvp = 1 THEN 1 ELSE 0 END) as mvp_count')
            ->first();

        $matches = (int) ($agg->matches_played ?? 0);
        $ratingCount = (int) ($agg->rating_count ?? 0);
        $wins = (int) ($agg->wins ?? 0);

        $data = [
            'matches_played' => $matches,
            'wins' => $wins,
            'draws' => (int) ($agg->draws ?? 0),
            'losses' => (int) ($agg->losses ?? 0),
            'goals' => (int) ($agg->goals ?? 0),
            'assists' => (int) ($agg->assists ?? 0),
            'own_goals' => (int) ($agg->own_goals ?? 0),
            'yellow_cards' => (int) ($agg->yellow_cards ?? 0),
            'red_cards' => (int) ($agg->red_cards ?? 0),
            'clean_sheets' => (int) ($agg->clean_sheets ?? 0),
            'minutes_played' => (int) ($agg->minutes_played ?? 0),
            'total_rating' => $agg->total_rating ?? 0,
            'rating_count' => $ratingCount,
            'avg_rating' => $ratingCount > 0 ? round((float) ($agg->total_rating ?? 0) / $ratingCount, 1) : 0,
            'best_match_rating' => $agg->best_match_rating,
            'mvp_count' => (int) ($agg->mvp_count ?? 0),
        ];

        $streaks = $this->streakInfo($userId);

        $data['current_streak_type'] = $streaks['current_type'];
        $data['current_streak_count'] = $streaks['current_count'];
        $data['longest_winning_streak'] = $streaks['longest_wins'];

        $stats = PlayerStatistic::where('user_id', $userId)->first() ?? new PlayerStatistic(['user_id' => $userId]);

        $stats->fill($data);

        $profile = PlayerProfile::where('user_id', $userId)->first();
        if ($profile) {
            $profile->matches_played = $data['matches_played'];
            $profile->wins = $data['wins'];
            $profile->draws = $data['draws'];
            $profile->losses = $data['losses'];
            $profile->rating = $data['avg_rating'];
            $profile->save();
        }

        return $stats;
    }

    private function streakInfo(int $userId): array
    {
        $results = PlayerMatchStat::query()
            ->where('user_id', $userId)
            ->whereNotNull('result')
            ->orderByDesc('match_date')
            ->orderByDesc('id')
            ->pluck('result');

        if ($results->isEmpty()) {
            return ['current_type' => null, 'current_count' => 0, 'longest_wins' => 0];
        }

        $currentType = $results->first();
        $currentCount = 0;
        foreach ($results as $result) {
            if ($result === $currentType) {
                $currentCount++;

                continue;
            }
            break;
        }

        $longestWins = 0;
        $run = 0;
        foreach ($results as $result) {
            if ($result === PlayerMatchStat::RESULT_WIN) {
                $run++;
                $longestWins = max($longestWins, $run);

                continue;
            }
            $run = 0;
        }

        return [
            'current_type' => $currentType,
            'current_count' => $currentCount,
            'longest_wins' => $longestWins,
        ];
    }
}
