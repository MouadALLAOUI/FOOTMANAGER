<?php

namespace App\Domains\Chat\Models;

use App\Domains\Match\Models\FootballMatch;
use App\Domains\Shared\Base\Model;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchChatMute extends Model
{
    protected $fillable = [
        'match_id',
        'user_id',
        'muted_until',
    ];

    protected function casts(): array
    {
        return [
            'muted_until' => 'datetime',
        ];
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(FootballMatch::class, 'match_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isActive(): bool
    {
        return ! $this->muted_until || $this->muted_until->isFuture();
    }
}
