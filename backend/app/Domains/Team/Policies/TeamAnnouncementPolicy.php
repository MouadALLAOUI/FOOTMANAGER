<?php

namespace App\Domains\Team\Policies;

use App\Domains\Player\Models\Player;
use App\Domains\Team\Models\TeamAnnouncement;
use App\Models\User;

class TeamAnnouncementPolicy
{
    public function view(User $user, TeamAnnouncement $announcement): bool
    {
        $team = $announcement->team;

        $belongsToTeam = (int) $team->manager_id === (int) $user->id
            || Player::where('team_id', $team->id)->where('user_id', $user->id)->exists();

        if (! $belongsToTeam) {
            return false;
        }

        if ((int) $team->manager_id === (int) $user->id) {
            return true;
        }

        return $announcement->isPublished() && $announcement->isTargetedTo($user->rosterPlayer);
    }

    public function update(User $user, TeamAnnouncement $announcement): bool
    {
        return (int) $announcement->team->manager_id === (int) $user->id;
    }

    public function delete(User $user, TeamAnnouncement $announcement): bool
    {
        return (int) $announcement->team->manager_id === (int) $user->id;
    }
}
