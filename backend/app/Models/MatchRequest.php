<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use DateTimeInterface;

class MatchRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'host_team_id',
        'target_team_id',
        'opponent_team_id',
        'stadium_id',
        'custom_terrain_name',
        'type',
        'match_datetime',
        'status',
        'notes',
        'price_per_player',
        'host_score',
        'opponent_score',
        'score_submitted_by',
        'score_status',
    ];

    protected function casts(): array
    {
        return [
            'match_datetime' => 'datetime:Y-m-d\TH:i',
            'price_per_player' => 'decimal:2',
            'host_score' => 'integer',
            'opponent_score' => 'integer',
        ];
    }

    protected function serializeDate(DateTimeInterface $date): string
    {
        return $date->format('Y-m-d\TH:i:s');
    }

    public function hostTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'host_team_id');
    }

    public function targetTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'target_team_id');
    }

    public function opponentTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'opponent_team_id');
    }

    public function stadium(): BelongsTo
    {
        return $this->belongsTo(Stadium::class, 'stadium_id');
    }

    public function scoreSubmittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'score_submitted_by');
    }
}
