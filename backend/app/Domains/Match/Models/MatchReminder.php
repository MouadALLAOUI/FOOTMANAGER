<?php

namespace App\Domains\Match\Models;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Shared\Base\Model;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchReminder extends Model
{
    protected $table = 'match_reminders';

    public const STATUS_PENDING = 'pending';
    public const STATUS_SENT = 'sent';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_EXPIRED = 'expired';

    protected $fillable = [
        'user_id',
        'fixture_id',
        'match_id',
        'match_title',
        'tournament_name',
        'stadium_name',
        'kickoff_at',
        'reminder_at',
        'status',
        'sent_at',
        'cancelled_at',
        'channel',
        'error_message',
        'retry_count',
    ];

    protected function casts(): array
    {
        return [
            'kickoff_at' => 'datetime',
            'reminder_at' => 'datetime',
            'sent_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'retry_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function fixture(): BelongsTo
    {
        return $this->belongsTo(Fixture::class);
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(FootballMatch::class, 'match_id');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeDue(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING)
            ->where('reminder_at', '<=', now());
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isSent(): bool
    {
        return $this->status === self::STATUS_SENT;
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    public function cancel(): bool
    {
        $this->status = self::STATUS_CANCELLED;
        $this->cancelled_at = now();

        return $this->save();
    }
}
