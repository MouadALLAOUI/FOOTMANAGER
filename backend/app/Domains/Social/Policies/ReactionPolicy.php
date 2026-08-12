<?php

namespace App\Domains\Social\Policies;

use App\Models\User;

class ReactionPolicy
{
    public function create(User $user): bool
    {
        return $user->status === 'approved';
    }

    public function delete(User $user): bool
    {
        return $user->status === 'approved';
    }
}
