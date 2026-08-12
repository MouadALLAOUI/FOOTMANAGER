<?php

namespace App\Domains\Team\Policies;

use App\Domains\Player\Models\Player;
use App\Domains\Team\Models\Team;
use App\Models\User;

class TeamPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return null;
    }

    public function ownsTeam(User $user, Team $team): bool
    {
        return (int) $team->manager_id === (int) $user->id;
    }

    public function belongsToTeam(User $user, Team $team): bool
    {
        if ($this->ownsTeam($user, $team)) {
            return true;
        }

        return Player::where('team_id', $team->id)->where('user_id', $user->id)->exists();
    }

    public function view(User $user, Team $team): bool
    {
        return $this->belongsToTeam($user, $team) || $team->isPublic();
    }

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function update(User $user, Team $team): bool
    {
        return $this->ownsTeam($user, $team);
    }

    public function uploadLogo(User $user, Team $team): bool
    {
        return $this->ownsTeam($user, $team);
    }

    public function uploadCover(User $user, Team $team): bool
    {
        return $this->ownsTeam($user, $team);
    }

    public function viewGallery(User $user, Team $team): bool
    {
        return $this->belongsToTeam($user, $team) || $team->isPublic();
    }

    public function manageGallery(User $user, Team $team): bool
    {
        return $this->ownsTeam($user, $team);
    }

    public function viewStatistics(User $user, Team $team): bool
    {
        return $this->belongsToTeam($user, $team) || $team->isPublic();
    }

    public function viewFixtures(User $user, Team $team): bool
    {
        return $this->belongsToTeam($user, $team) || $team->isPublic();
    }

    public function viewDashboard(User $user, Team $team): bool
    {
        return $this->belongsToTeam($user, $team);
    }

    public function viewFormation(User $user, Team $team): bool
    {
        return $this->belongsToTeam($user, $team);
    }

    public function manageFormation(User $user, Team $team): bool
    {
        return $this->ownsTeam($user, $team);
    }

    public function viewAttendance(User $user, Team $team): bool
    {
        return $this->belongsToTeam($user, $team);
    }

    public function manageAttendance(User $user, Team $team): bool
    {
        return $this->ownsTeam($user, $team);
    }

    public function assignCaptain(User $user, Team $team): bool
    {
        return $this->ownsTeam($user, $team);
    }

    public function viewAnnouncements(User $user, Team $team): bool
    {
        return $this->belongsToTeam($user, $team);
    }

    public function manageAnnouncements(User $user, Team $team): bool
    {
        return $this->ownsTeam($user, $team);
    }

    public function managePlayers(User $user, Team $team): bool
    {
        return $this->ownsTeam($user, $team);
    }
}
