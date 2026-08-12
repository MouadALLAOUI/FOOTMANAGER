<?php

namespace App\Domains\Review\Policies;

use App\Domains\Review\Models\StadiumReview;
use App\Domains\Stadium\Models\Stadium;
use App\Models\User;

class StadiumReviewPolicy
{
    public function create(User $user, Stadium $stadium): bool
    {
        if ($user->status !== 'approved') {
            return false;
        }

        return ! $stadium->owner_id || (int) $stadium->owner_id !== (int) $user->id;
    }

    public function update(User $user, StadiumReview $review): bool
    {
        return (int) $review->user_id === (int) $user->id || $user->isAdmin();
    }

    public function delete(User $user, StadiumReview $review): bool
    {
        return (int) $review->user_id === (int) $user->id || $user->isAdmin();
    }
}
