<?php

namespace App\Domains\Chat\Models;

use App\Domains\Chat\Events\ChatMessageSent;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Shared\Base\Model;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MatchChatMessage extends Model
{
    use SoftDeletes;

    public const TYPE_TEXT = 'text';

    public const TYPE_SYSTEM = 'system';

    public const TYPE_ANNOUNCEMENT = 'announcement';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_HIDDEN = 'hidden';

    protected $fillable = [
        'match_id',
        'user_id',
        'type',
        'message',
        'is_pinned',
        'is_edited',
        'is_system',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'is_pinned' => 'boolean',
            'is_edited' => 'boolean',
            'is_system' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::created(function (MatchChatMessage $message) {
            if ($message->status === self::STATUS_ACTIVE) {
                ChatMessageSent::dispatch($message);
            }
        });
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(FootballMatch::class, 'match_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isManagerAnnouncement(): bool
    {
        return $this->type === self::TYPE_ANNOUNCEMENT;
    }
}
