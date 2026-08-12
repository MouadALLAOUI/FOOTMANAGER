<?php

namespace App\Domains\Social\Models;

use App\Domains\Shared\Base\Model;
use App\Domains\Social\Events\CommentCreated;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Comment extends Model
{
    use SoftDeletes;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_HIDDEN = 'hidden';

    protected $fillable = [
        'user_id',
        'commentable_type',
        'commentable_id',
        'parent_id',
        'body',
        'status',
        'is_pinned',
        'is_edited',
    ];

    protected function casts(): array
    {
        return [
            'is_pinned' => 'boolean',
            'is_edited' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::created(function (Comment $comment) {
            if ($comment->status === self::STATUS_ACTIVE) {
                CommentCreated::dispatch($comment);
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function commentable(): MorphTo
    {
        return $this->morphTo();
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(Comment::class, 'parent_id')
            ->where('status', self::STATUS_ACTIVE)
            ->orderByDesc('created_at');
    }

    public function likes(): HasMany
    {
        return $this->hasMany(CommentLike::class);
    }

    public function reactions(): MorphMany
    {
        return $this->morphMany(Reaction::class, 'reactionable');
    }

    public function isReply(): bool
    {
        return $this->parent_id !== null;
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function likesCount(): int
    {
        return (int) $this->likes_count;
    }
}
