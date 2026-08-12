<?php

namespace App\Domains\Player\Policies;

use App\Domains\Player\Models\PlayerProfile;
use App\Domains\Player\Models\PlayerTransfer;
use App\Models\User;

class PlayerTransferPolicy
{
    public function view(User $user, PlayerTransfer $transfer): bool
    {
        if ((int) $transfer->user_id === (int) $user->id) {
            return true;
        }

        $profile = PlayerProfile::where('user_id', $transfer->user_id)->first();

        return $profile?->isPubliclyVisible() ?? false;
    }
}
