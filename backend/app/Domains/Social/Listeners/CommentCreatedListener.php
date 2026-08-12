<?php

namespace App\Domains\Social\Listeners;

use App\Domains\Match\Models\FootballMatch;
use App\Domains\Notification\Services\NotificationService;
use App\Domains\Social\Events\CommentCreated;
use App\Domains\Social\Models\Comment;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Str;

class CommentCreatedListener implements ShouldQueue
{
    public function __construct(
        protected NotificationService $notifications,
    ) {}

    public function handle(CommentCreated $event): void
    {
        $comment = $event->comment;

        if ($comment->parent_id) {
            $this->notifyReplyParent($comment);

            return;
        }

        $this->notifyCommentableOwner($comment);
    }

    protected function notifyReplyParent(Comment $comment): void
    {
        $parent = $comment->parent;

        if (! $parent || (int) $parent->user_id === (int) $comment->user_id) {
            return;
        }

        $this->notifications->notify(
            (int) $parent->user_id,
            'comment_reply',
            'رد جديد على تعليقك',
            $comment->user?->name.' رد على تعليقك: '.Str::limit($comment->body, 60),
            ['comment_id' => $comment->id, 'parent_id' => $parent->id],
            $this->targetUrl($comment),
        );
    }

    protected function notifyCommentableOwner(Comment $comment): void
    {
        $target = $comment->commentable;

        if (! $target) {
            return;
        }

        $ownerId = match (true) {
            $target instanceof Team => $target->manager_id,
            $target instanceof Stadium => $target->owner_id,
            $target instanceof FootballMatch => $target->created_by,
            default => null,
        };

        if (! $ownerId || (int) $ownerId === (int) $comment->user_id) {
            return;
        }

        $this->notifications->notify(
            (int) $ownerId,
            'new_comment',
            'تعليق جديد',
            $comment->user?->name.' علّق: '.Str::limit($comment->body, 60),
            ['comment_id' => $comment->id],
            $this->targetUrl($comment),
        );
    }

    protected function targetUrl(Comment $comment): ?string
    {
        return $comment->commentable_id
            ? '/social/'.$comment->commentable?->getMorphClass().'/'.$comment->commentable_id
            : null;
    }
}
