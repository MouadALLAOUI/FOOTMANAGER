<?php

namespace App\Domains\Player\Policies;

use App\Domains\Player\Models\PlayerProfile;
use App\Models\User;

class PlayerProfilePolicy
{
    public function view(User $user, PlayerProfile $profile): bool
    {
        if ((int) $profile->user_id === (int) $user->id) {
            return true;
        }

        return $profile->isPubliclyVisible();
    }

    public function update(User $user, PlayerProfile $profile): bool
    {
        return (int) $profile->user_id === (int) $user->id;
    }

    public function manage(User $user, PlayerProfile $profile): bool
    {
        return $this->update($user, $profile);
    }
}
