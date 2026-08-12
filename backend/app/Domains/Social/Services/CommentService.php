<?php

namespace App\Domains\Social\Services;

use App\Domains\Match\Models\FootballMatch;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Social\Events\CommentLiked;
use App\Domains\Social\Models\Comment;
use App\Domains\Social\Models\CommentLike;
use App\Domains\Social\Queries\CommentQuery;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;

class CommentService
{
    public function __construct(
        protected CommentQuery $query,
    ) {}

    public function create(User $user, Model $commentable, array $data): Comment
    {
        $parent = null;

        if (! empty($data['parent_id'])) {
            $parent = Comment::query()->findOrFail((int) $data['parent_id']);

            if ($parent->commentable_type !== $commentable->getMorphClass() || (int) $parent->commentable_id !== (int) $commentable->getKey()) {
                throw new DomainException('لا يمكن الرد على هذا التعليق هنا.', 422);
            }
        }

        $comment = Comment::query()->create([
            'user_id' => $user->id,
            'commentable_type' => $commentable->getMorphClass(),
            'commentable_id' => $commentable->getKey(),
            'parent_id' => $parent?->id,
            'body' => $data['body'],
        ]);

        return $this->loadComment($comment, $user);
    }

    public function reply(User $user, Comment $parent, string $body): Comment
    {
        if (! $parent->commentable) {
            throw new DomainException('الهدف المرتبط بالتعليق غير متوفر.', 422);
        }

        $comment = Comment::query()->create([
            'user_id' => $user->id,
            'commentable_type' => $parent->commentable_type,
            'commentable_id' => $parent->commentable_id,
            'parent_id' => $parent->id,
            'body' => $body,
        ]);

        return $this->loadComment($comment, $user);
    }

    public function update(User $user, Comment $comment, string $body): Comment
    {
        if ($comment->user_id !== $user->id && ! $user->isAdmin()) {
            throw new DomainException('لا يمكنك تعديل هذا التعليق.', 403);
        }

        $comment->update([
            'body' => $body,
            'is_edited' => true,
        ]);

        return $this->loadComment($comment, $user);
    }

    public function delete(User $user, Comment $comment): void
    {
        if ($comment->user_id !== $user->id && ! $user->isAdmin()) {
            throw new DomainException('لا يمكنك حذف هذا التعليق.', 403);
        }

        $comment->delete();
    }

    public function pin(User $user, Comment $comment): Comment
    {
        if (! $user->isAdmin() && ! $this->canModerate($user, $comment)) {
            throw new DomainException('لا يمكنك تثبيت هذا التعليق.', 403);
        }

        Comment::query()
            ->where('commentable_type', $comment->commentable_type)
            ->where('commentable_id', $comment->commentable_id)
            ->where('is_pinned', true)
            ->where('id', '!=', $comment->id)
            ->update(['is_pinned' => false]);

        $comment->update(['is_pinned' => ! $comment->is_pinned]);

        return $this->loadComment($comment, $user);
    }

    public function like(User $user, Comment $comment): Comment
    {
        $exists = CommentLike::query()
            ->where('comment_id', $comment->id)
            ->where('user_id', $user->id)
            ->exists();

        if ($exists) {
            CommentLike::query()
                ->where('comment_id', $comment->id)
                ->where('user_id', $user->id)
                ->delete();
        } else {
            CommentLike::query()->create([
                'comment_id' => $comment->id,
                'user_id' => $user->id,
            ]);

            CommentLiked::dispatch($comment, $user);
        }

        return $this->loadComment($comment, $user);
    }

    public function list(Model $commentable, ?string $sort = 'newest', ?int $page = 1, int $perPage = 15, ?User $user = null): LengthAwarePaginator
    {
        return $this->query->applySort(
            $this->query->base($commentable),
            $sort,
        )->paginate($perPage, ['*'], 'page', max(1, (int) $page))
            ->through(function (Comment $comment) use ($user) {
                return $this->loadComment($comment, $user);
            });
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

    protected function loadComment(Comment $comment, ?User $user = null): Comment
    {
        $comment->load('user:id,name,role');
        $comment->loadCount('likes');

        if ($user) {
            $comment->liked_by_me = CommentLike::query()
                ->where('comment_id', $comment->id)
                ->where('user_id', $user->id)
                ->exists();
        } else {
            $comment->liked_by_me = false;
        }

        return $comment;
    }
}
