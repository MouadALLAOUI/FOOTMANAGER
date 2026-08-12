<?php

namespace App\Domains\Player\Policies;

use App\Domains\Player\Models\PlayerAvailabilitySlot;
use App\Models\User;

class PlayerAvailabilitySlotPolicy
{
    public function manage(User $user, PlayerAvailabilitySlot $slot): bool
    {
        return (int) $slot->user_id === (int) $user->id;
    }

    public function update(User $user, PlayerAvailabilitySlot $slot): bool
    {
        return $this->manage($user, $slot);
    }

    public function delete(User $user, PlayerAvailabilitySlot $slot): bool
    {
        return $this->manage($user, $slot);
    }
}
