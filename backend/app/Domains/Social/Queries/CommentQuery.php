<?php

namespace App\Domains\Social\Queries;

use App\Domains\Social\Models\Comment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class CommentQuery
{
    public function base(Model $commentable): Builder
    {
        return Comment::query()
            ->where('commentable_type', $commentable->getMorphClass())
            ->where('commentable_id', $commentable->getKey())
            ->where('status', Comment::STATUS_ACTIVE)
            ->whereNull('parent_id')
            ->withCount('likes')
            ->with('user:id,name,role');
    }

    public function applySort(Builder $query, ?string $sort): Builder
    {
        return match ($sort) {
            'oldest' => $query->orderBy('created_at'),
            'most_liked' => $query->orderByDesc('likes_count')->orderByDesc('created_at'),
            default => $query->orderByDesc('is_pinned')->orderByDesc('created_at'),
        };
    }
}
