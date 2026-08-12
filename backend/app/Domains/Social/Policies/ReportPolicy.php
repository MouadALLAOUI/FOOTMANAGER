<?php

namespace App\Domains\Social\Policies;

use App\Models\User;

class ReportPolicy
{
    public function create(User $user): bool
    {
        return $user->status === 'approved';
    }

    public function moderate(User $user): bool
    {
        return $user->isAdmin();
    }
}
