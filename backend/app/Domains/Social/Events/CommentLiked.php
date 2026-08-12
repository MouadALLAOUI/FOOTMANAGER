<?php

namespace App\Domains\Social\Events;

use App\Domains\Social\Models\Comment;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentLiked
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Comment $comment,
        public User $liker,
    ) {}
}
