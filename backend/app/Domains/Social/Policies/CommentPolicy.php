<?php

namespace App\Domains\Social\Policies;

use App\Domains\Match\Models\FootballMatch;
use App\Domains\Social\Models\Comment;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Models\User;

class CommentPolicy
{
    public function create(User $user): bool
    {
        return $user->status === 'approved';
    }

    public function update(User $user, Comment $comment): bool
    {
        return (int) $comment->user_id === (int) $user->id || $user->isAdmin();
    }

    public function delete(User $user, Comment $comment): bool
    {
        return (int) $comment->user_id === (int) $user->id || $user->isAdmin();
    }

    public function like(User $user, Comment $comment): bool
    {
        return $user->status === 'approved';
    }

    public function pin(User $user, Comment $comment): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $this->canModerate($user, $comment);
    }

    public function report(User $user, Comment $comment): bool
    {
        return (int) $comment->user_id !== (int) $user->id;
    }

    protected function canModerate(User $user, Comment $comment): bool
    {
        $target = $comment->commentable;

        if (! $target) {
            return false;
        }

        if ($target instanceof Team) {
            return (int) $target->manager_id === (int) $user->id;
        }

        if ($target instanceof Stadium) {
            return (int) $target->owner_id === (int) $user->id;
        }

        if ($target instanceof FootballMatch) {
            return in_array((int) $user->id, [
                (int) $target->homeTeam?->manager_id,
                (int) $target->awayTeam?->manager_id,
            ], true);
        }

        return false;
    }
}
