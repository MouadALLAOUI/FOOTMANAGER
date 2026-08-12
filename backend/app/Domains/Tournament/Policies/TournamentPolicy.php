<?php

namespace App\Domains\Tournament\Policies;

use App\Domains\Tournament\Models\Tournament;
use App\Models\User;

class TournamentPolicy
{
    public function create(User $user): bool
    {
        return $user->role === 'committee';
    }

    public function view(User $user, Tournament $tournament): bool
    {
        return (int) $tournament->organizer_id === (int) $user->id;
    }

    public function manage(User $user, Tournament $tournament): bool
    {
        return (int) $tournament->organizer_id === (int) $user->id;
    }
}
