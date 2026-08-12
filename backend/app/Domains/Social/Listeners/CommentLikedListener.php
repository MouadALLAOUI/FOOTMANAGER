<?php

namespace App\Domains\Social\Listeners;

use App\Domains\Notification\Services\NotificationService;
use App\Domains\Social\Events\CommentLiked;
use Illuminate\Contracts\Queue\ShouldQueue;

class CommentLikedListener implements ShouldQueue
{
    public function __construct(
        protected NotificationService $notifications,
    ) {}

    public function handle(CommentLiked $event): void
    {
        if ((int) $event->comment->user_id === (int) $event->liker->id) {
            return;
        }

        $this->notifications->notify(
            (int) $event->comment->user_id,
            'like',
            'إعجاب جديد',
            $event->liker->name.' أعجب بتعليقك.',
            ['comment_id' => $event->comment->id],
        );
    }
}
