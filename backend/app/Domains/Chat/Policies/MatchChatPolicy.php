<?php

namespace App\Domains\Chat\Policies;

use App\Domains\Chat\Models\MatchChatMessage;
use App\Domains\Chat\Models\MatchChatMute;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Services\MatchMembershipService;
use App\Domains\Team\Models\Team;
use App\Models\User;

class MatchChatPolicy
{
    public function view(User $user, FootballMatch $match): bool
    {
        return app(MatchMembershipService::class)->userParticipates($user, $match);
    }

    public function send(User $user, FootballMatch $match): bool
    {
        if ($user->status !== 'approved') {
            return false;
        }

        if (! app(MatchMembershipService::class)->userParticipates($user, $match)) {
            return false;
        }

        return ! MatchChatMute::query()
            ->where('match_id', $match->id)
            ->where('user_id', $user->id)
            ->where(function ($q) {
                $q->whereNull('muted_until')->orWhere('muted_until', '>', now());
            })
            ->exists();
    }

    public function update(User $user, MatchChatMessage $message): bool
    {
        return (int) $message->user_id === (int) $user->id || $user->isAdmin();
    }

    public function delete(User $user, MatchChatMessage $message): bool
    {
        return (int) $message->user_id === (int) $user->id || $user->isAdmin();
    }

    public function pin(User $user, FootballMatch $match): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        $teamIds = array_filter([$match->home_team_id, $match->away_team_id]);

        if (empty($teamIds)) {
            return false;
        }

        return Team::query()
            ->whereIn('id', $teamIds)
            ->where('manager_id', $user->id)
            ->exists();
    }

    public function mute(User $user, FootballMatch $match): bool
    {
        return $user->status === 'approved'
            && app(MatchMembershipService::class)->userParticipates($user, $match);
    }
}
