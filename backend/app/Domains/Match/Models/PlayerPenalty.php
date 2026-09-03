<?php

namespace App\Domains\Match\Models;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Model;
use App\Domains\Team\Models\Team;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerPenalty extends Model
{
    protected $table = 'player_penalties';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_ENDED_EARLY = 'ended_early';

    public const STATUS_DISMISSED = 'dismissed';

    protected $fillable = [
        'match_id',
        'player_id',
        'team_id',
        'half',
        'start_minute',
        'duration_minutes',
        'end_minute',
        'status',
        'triggered_by_event_id',
    ];

    protected function casts(): array
    {
        return [
            'start_minute' => 'integer',
            'duration_minutes' => 'integer',
            'end_minute' => 'integer',
        ];
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(FootballMatch::class, 'match_id');
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'player_id');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
    }

    public function triggeredByEvent(): BelongsTo
    {
        return $this->belongsTo(MatchEvent::class, 'triggered_by_event_id');
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }
}