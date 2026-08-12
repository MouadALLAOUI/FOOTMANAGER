<?php

namespace App\Domains\Player\Policies;

use App\Domains\Player\Models\PlayerGalleryImage;
use App\Domains\Player\Models\PlayerProfile;
use App\Models\User;

class PlayerGalleryImagePolicy
{
    public function view(User $user, PlayerGalleryImage $image): bool
    {
        if ((int) $image->user_id === (int) $user->id) {
            return true;
        }

        $profile = PlayerProfile::where('user_id', $image->user_id)->first();

        return $profile?->isPubliclyVisible() ?? false;
    }

    public function manage(User $user, PlayerGalleryImage $image): bool
    {
        return (int) $image->user_id === (int) $user->id;
    }

    public function update(User $user, PlayerGalleryImage $image): bool
    {
        return $this->manage($user, $image);
    }

    public function delete(User $user, PlayerGalleryImage $image): bool
    {
        return $this->manage($user, $image);
    }
}
