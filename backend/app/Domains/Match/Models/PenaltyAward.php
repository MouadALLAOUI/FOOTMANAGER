<?php

namespace App\Domains\Match\Models;

use App\Domains\Shared\Base\Model;
use App\Domains\Team\Models\Team;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PenaltyAward extends Model
{
    protected $table = 'penalty_awards';

    public const STATUS_AWARDED = 'awarded';

    public const STATUS_CONVERTED = 'converted';

    public const STATUS_MISSED = 'missed';

    public const STATUS_SAVED = 'saved';

    public const STATUS_VOIDED = 'voided';

    public const STATUS_DISMISSED = 'dismissed';

    /** Outcome statuses that resolve an award from an outcome event. */
    public const OUTCOME_STATUSES = [
        self::STATUS_CONVERTED,
        self::STATUS_MISSED,
        self::STATUS_SAVED,
    ];

    protected $fillable = [
        'match_id',
        'awarded_to_team_id',
        'committing_team_id',
        'triggering_foul_count',
        'half',
        'minute',
        'status',
        'outcome_event_id',
        'triggered_by_event_id',
    ];

    protected function casts(): array
    {
        return [
            'triggering_foul_count' => 'integer',
            'minute' => 'integer',
        ];
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(FootballMatch::class, 'match_id');
    }

    public function awardedToTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'awarded_to_team_id');
    }

    public function committingTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'committing_team_id');
    }

    public function outcomeEvent(): BelongsTo
    {
        return $this->belongsTo(MatchEvent::class, 'outcome_event_id');
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_AWARDED;
    }
}