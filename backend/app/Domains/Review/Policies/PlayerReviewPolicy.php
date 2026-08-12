<?php

namespace App\Domains\Review\Policies;

use App\Domains\Player\Models\Player;
use App\Domains\Review\Models\PlayerReview;
use App\Models\User;

class PlayerReviewPolicy
{
    public function create(User $user, Player $player): bool
    {
        return $user->status === 'approved';
    }

    public function update(User $user, PlayerReview $review): bool
    {
        return (int) $review->reviewer_id === (int) $user->id || $user->isAdmin();
    }

    public function delete(User $user, PlayerReview $review): bool
    {
        return (int) $review->reviewer_id === (int) $user->id || $user->isAdmin();
    }
}
