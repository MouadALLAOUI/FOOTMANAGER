<?php

namespace App\Domains\Match\Models;

use App\Domains\Shared\Base\Model;
use App\Domains\Team\Models\Team;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Per-team, per-match-request formation context (structure/identity only).
 *
 * The full tactical lineup lives on match_lineups rows; this snapshot simply
 * records which formation/preset the team built the match lineup from so the
 * drawer can label it without mutating the team's saved formations.
 */
class MatchFormationSnapshot extends Model
{
    protected $fillable = [
        'match_request_id',
        'team_id',
        'format',
        'preset_key',
        'formation',
    ];

    public function matchRequest(): BelongsTo
    {
        return $this->belongsTo(MatchRequest::class, 'match_request_id');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
    }
}