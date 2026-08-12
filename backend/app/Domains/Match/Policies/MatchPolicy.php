<?php

namespace App\Domains\Match\Policies;

use App\Domains\Match\Models\FootballMatch;
use App\Models\User;

class MatchPolicy
{
    public function view(User $user, FootballMatch $match): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isApproved() && $user->currentTeam() !== null;
    }

    public function manage(User $user, FootballMatch $match): bool
    {
        if (! $user->isApproved()) {
            return false;
        }

        return $this->managesTeam($user, $match->home_team_id)
            || $this->managesTeam($user, $match->away_team_id);
    }

    public function update(User $user, FootballMatch $match): bool
    {
        return $this->manage($user, $match);
    }

    public function delete(User $user, FootballMatch $match): bool
    {
        return $this->manage($user, $match);
    }

    protected function managesTeam(User $user, ?int $teamId): bool
    {
        if (! $teamId) {
            return false;
        }

        return (int) $user->currentTeam()?->id === (int) $teamId;
    }
}
