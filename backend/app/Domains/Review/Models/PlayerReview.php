<?php

namespace App\Domains\Review\Models;

use App\Domains\Match\Models\FootballMatch;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Model;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerReview extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_HIDDEN = 'hidden';

    protected $fillable = [
        'player_id',
        'match_id',
        'reviewer_id',
        'rating',
        'sportsmanship',
        'teamwork',
        'skill',
        'punctuality',
        'comment',
        'is_anonymous',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'sportsmanship' => 'integer',
            'teamwork' => 'integer',
            'skill' => 'integer',
            'punctuality' => 'integer',
            'is_anonymous' => 'boolean',
        ];
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'player_id');
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(FootballMatch::class, 'match_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }
}
