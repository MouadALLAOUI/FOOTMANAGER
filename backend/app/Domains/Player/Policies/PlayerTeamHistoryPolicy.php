<?php

namespace App\Domains\Player\Policies;

use App\Domains\Player\Models\PlayerProfile;
use App\Domains\Player\Models\PlayerTeamHistory;
use App\Models\User;

class PlayerTeamHistoryPolicy
{
    public function view(User $user, PlayerTeamHistory $history): bool
    {
        if ((int) $history->user_id === (int) $user->id) {
            return true;
        }

        $profile = PlayerProfile::where('user_id', $history->user_id)->first();

        return $profile?->isPubliclyVisible() ?? false;
    }
}
