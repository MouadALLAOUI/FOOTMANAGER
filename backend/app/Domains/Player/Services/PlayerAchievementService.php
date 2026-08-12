<?php

namespace App\Domains\Player\Services;

use App\Domains\Player\Models\Achievement;
use App\Domains\Player\Models\PlayerAchievement;
use App\Domains\Player\Models\PlayerMatchStat;
use Illuminate\Database\Eloquent\Collection;

class PlayerAchievementService
{
    public function catalog(): Collection
    {
        return Achievement::query()->orderBy('id')->get();
    }

    public function for(int $userId): Collection
    {
        return PlayerAchievement::query()
            ->where('user_id', $userId)
            ->with('achievement')
            ->orderByDesc('unlocked_at')
            ->orderByDesc('id')
            ->get();
    }

    public function unlocked(int $userId): Collection
    {
        return PlayerAchievement::query()
            ->where('user_id', $userId)
            ->whereNotNull('unlocked_at')
            ->with('achievement')
            ->orderByDesc('unlocked_at')
            ->get();
    }

    public function evaluate(int $userId, array $context = []): array
    {
        $unlocked = [];

        foreach ($this->catalog() as $achievement) {
            $progress = $this->progressFor($achievement, $userId, $context);

            $playerAchievement = PlayerAchievement::firstOrCreate(
                ['user_id' => $userId, 'achievement_id' => $achievement->id],
                ['progress' => 0, 'unlocked_at' => null],
            );

            $playerAchievement->progress = $progress;

            $target = $this->targetFor($achievement);
            if (! $playerAchievement->unlocked_at && $target > 0 && $progress >= $target) {
                $playerAchievement->unlocked_at = now();
                $unlocked[] = $achievement;
            }

            $playerAchievement->save();
        }

        return $unlocked;
    }

    public function progressFor(Achievement $achievement, int $userId, array $context = []): int
    {
        return match ($achievement->key) {
            'first_match' => $context['matches_played'] ?? $this->matchStats($userId)->count(),
            'first_goal' => $context['goals'] ?? $this->matchStats($userId)->sum('goals'),
            'top_scorer' => $context['goals'] ?? $this->matchStats($userId)->sum('goals'),
            'best_playmaker' => $context['assists'] ?? $this->matchStats($userId)->sum('assists'),
            'most_valuable_player' => $context['mvp_count'] ?? $this->matchStats($userId)->where('mvp', true)->count(),
            'iron_man' => $context['matches_played'] ?? $this->matchStats($userId)->count(),
            'hat_trick_hero' => $this->hatTrickCount($userId),
            'winning_streak' => $context['longest_winning_streak'] ?? 0,
            'tournament_champion' => $this->matchStats($userId)->where('is_tournament', true)->where('result', PlayerMatchStat::RESULT_WIN)->count(),
            'clean_sheet_master' => $context['clean_sheets'] ?? $this->matchStats($userId)->where('clean_sheet', true)->count(),
            default => 0,
        };
    }

    public function targetFor(Achievement $achievement): int
    {
        $thresholds = config('player.achievements');

        return match ($achievement->key) {
            'first_match' => 1,
            'first_goal' => 1,
            'top_scorer' => $thresholds['top_scorer_goals'],
            'best_playmaker' => $thresholds['best_playmaker_assists'],
            'most_valuable_player' => $thresholds['mvp_count'],
            'iron_man' => $thresholds['iron_man_matches'],
            'hat_trick_hero' => 1,
            'winning_streak' => $thresholds['winning_streak'],
            'tournament_champion' => 1,
            'clean_sheet_master' => 1,
            default => 0,
        };
    }

    private function matchStats(int $userId): Collection
    {
        return PlayerMatchStat::query()->where('user_id', $userId)->get();
    }

    private function hatTrickCount(int $userId): int
    {
        return PlayerMatchStat::query()
            ->where('user_id', $userId)
            ->where('goals', '>=', 3)
            ->count();
    }
}
