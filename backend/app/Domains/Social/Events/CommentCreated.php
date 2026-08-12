<?php

namespace App\Domains\Social\Events;

use App\Domains\Social\Models\Comment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(public Comment $comment) {}
}
