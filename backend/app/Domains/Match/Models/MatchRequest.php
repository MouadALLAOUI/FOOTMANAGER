<?php

namespace App\Domains\Match\Models;

use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Domains\Team\Models\TeamMatchPlayer;
use App\Models\User;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MatchRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'host_team_id',
        'target_team_id',
        'opponent_team_id',
        'mercenary_player_id',
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
        'needs_players',
        'players_needed',
        'started_at',
    ];

    protected $appends = [
        'players_joined',
        'players_remaining',
        'players_full',
    ];

    protected function casts(): array
    {
        return [
            'match_datetime' => 'datetime:Y-m-d\TH:i',
            'price_per_player' => 'decimal:2',
            'host_score' => 'integer',
            'opponent_score' => 'integer',
            'needs_players' => 'boolean',
            'players_needed' => 'integer',
            'started_at' => 'datetime',
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

    public function mercenary(): BelongsTo
    {
        return $this->belongsTo(User::class, 'mercenary_player_id');
    }

    public function teamMatchPlayers(): HasMany
    {
        return $this->hasMany(TeamMatchPlayer::class, 'match_request_id');
    }

    public function playerApplications(): HasMany
    {
        return $this->hasMany(PlayerMatchRequest::class, 'match_request_id');
    }

    public function getPlayersJoinedAttribute(): int
    {
        if (isset($this->players_joined_count)) {
            return (int) $this->players_joined_count;
        }

        return (int) $this->playerApplications()->where('status', 'accepted')->count();
    }

    public function getPlayersRemainingAttribute(): int
    {
        if (! $this->needs_players) {
            return 0;
        }

        return max((int) ($this->players_needed ?? 0) - $this->players_joined, 0);
    }

    public function getPlayersFullAttribute(): bool
    {
        return $this->needs_players && $this->players_remaining === 0;
    }
}
