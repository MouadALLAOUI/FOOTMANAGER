<?php

namespace App\Domains\Match\Models;

use App\Domains\Match\Enums\MatchEventType;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Model;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class MatchEvent extends Model
{
    protected $fillable = [
        'uuid',
        'match_id',
        'team_id',
        'player_id',
        'assist_player_id',
        'type',
        'minute',
        'added_time',
        'half',
        'period',
        'description',
        'metadata',
        'icon',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'uuid' => 'string',
            'type' => MatchEventType::class,
            'minute' => 'integer',
            'added_time' => 'integer',
            'metadata' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (MatchEvent $event) {
            $event->uuid ??= (string) Str::uuid();
        });
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(FootballMatch::class, 'match_id');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'player_id');
    }

    public function assistPlayer(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'assist_player_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
