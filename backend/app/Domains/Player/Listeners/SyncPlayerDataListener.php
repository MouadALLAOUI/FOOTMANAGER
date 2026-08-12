<?php

namespace App\Domains\Player\Listeners;

use App\Domains\Match\Events\FixtureCompleted;
use App\Domains\Player\Services\PlayerAchievementService;
use App\Domains\Player\Services\PlayerCareerService;
use App\Domains\Player\Services\PlayerStatisticsService;

class SyncPlayerDataListener
{
    public function __construct(
        private PlayerStatisticsService $statistics,
        private PlayerAchievementService $achievements,
        private PlayerCareerService $career,
    ) {}

    public function handle(FixtureCompleted $event): void
    {
        $match = $event->match;

        $this->statistics->syncForMatch($match);

        $userIds = $match->teamMatchPlayers()
            ->whereNotNull('player_id')
            ->with('player:id,user_id')
            ->get()
            ->map(fn ($tmp) => $tmp->player?->user_id)
            ->filter()
            ->unique();

        foreach ($userIds as $userId) {
            $stats = $this->statistics->for((int) $userId);

            $this->achievements->evaluate((int) $userId, [
                'matches_played' => $stats->matches_played,
                'goals' => $stats->goals,
                'assists' => $stats->assists,
                'mvp_count' => $stats->mvp_count,
                'longest_winning_streak' => $stats->longest_winning_streak,
                'clean_sheets' => $stats->clean_sheets,
            ]);
        }

        // Refresh current-team career totals for participating teams.
        foreach ([$match->host_team_id, $match->opponent_team_id] as $teamId) {
            if (! $teamId) {
                continue;
            }

            foreach ($userIds as $userId) {
                $this->career->refreshMatchTotals((int) $userId, (int) $teamId);
            }
        }
    }
}
