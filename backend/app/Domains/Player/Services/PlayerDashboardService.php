<?php

namespace App\Domains\Player\Services;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Shared\Support\PlayerCache;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class PlayerDashboardService
{
    public function __construct(
        private PlayerProfileService $profile,
        private PlayerStatisticsService $statistics,
        private PlayerCareerService $career,
        private PlayerAchievementService $achievements,
        private PlayerAvailabilityService $availability,
    ) {}

    public function for(User $user): array
    {
        $ttl = (int) config('player.cache.dashboard_ttl');

        return Cache::remember(PlayerCache::dashboard($user->id), $ttl, function () use ($user) {
            $profile = $this->profile->for($user);
            $stats = $this->statistics->for($user->id);

            $upcoming = null;
            if ($team = $user->rosterPlayer?->team) {
                $upcoming = MatchRequest::query()
                    ->where('status', 'accepted')
                    ->where('match_datetime', '>=', now())
                    ->where(function ($q) use ($team) {
                        $q->where('host_team_id', $team->id)->orWhere('opponent_team_id', $team->id);
                    })
                    ->orderBy('match_datetime')
                    ->first();
            }

            return [
                'profile' => $profile,
                'statistics' => $stats,
                'form' => $this->statistics->form($user->id, 5),
                'upcoming_match' => $upcoming,
                'recent_matches' => $this->statistics->performance($user->id, 5),
                'achievements' => $this->achievements->unlocked($user->id)->take(4),
                'current_team' => $user->rosterPlayer?->team,
                'career_history' => $this->career->history($user->id)->take(3),
                'availability' => $this->availability->weeklySchedule($user->id),
            ];
        });
    }
}
