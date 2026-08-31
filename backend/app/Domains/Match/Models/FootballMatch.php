<?php

namespace App\Domains\Match\Models;

use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Shared\Base\Model;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class FootballMatch extends Model
{
    protected $table = 'matches';

    protected $fillable = [
        'uuid',
        'match_request_id',
        'competition_id',
        'season_id',
        'round_id',
        'group_id',
        'home_team_id',
        'away_team_id',
        'stadium_id',
        'status',
        'current_period',
        'current_minute',
        'added_time',
        'home_score',
        'away_score',
        'home_penalties',
        'away_penalties',
        'extra_time',
        'is_confirmed',
        'active_reservation_id',
        'notes',
        'winner_team_id',
        'match_duration_minutes',
        'weather',
        'attendance',
        'created_by',
        'started_at',
        'kicked_off_at',
        'second_half_started_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'uuid' => 'string',
            'status' => MatchStatus::class,
            'weather' => 'array',
            'current_minute' => 'integer',
            'added_time' => 'integer',
            'home_score' => 'integer',
            'away_score' => 'integer',
            'home_penalties' => 'integer',
            'away_penalties' => 'integer',
            'extra_time' => 'boolean',
            'is_confirmed' => 'boolean',
            'attendance' => 'integer',
            'started_at' => 'datetime',
            'kicked_off_at' => 'datetime',
            'second_half_started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (FootballMatch $match) {
            $match->uuid ??= (string) Str::uuid();
        });
    }

    public function matchRequest(): BelongsTo
    {
        return $this->belongsTo(MatchRequest::class, 'match_request_id');
    }

    public function homeTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'home_team_id')->withTrashed();
    }

    public function awayTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'away_team_id')->withTrashed();
    }

    public function stadium(): BelongsTo
    {
        return $this->belongsTo(Stadium::class, 'stadium_id');
    }

    public function winnerTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'winner_team_id')->withTrashed();
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function events(): HasMany
    {
        return $this->hasMany(MatchEvent::class, 'match_id')->orderBy('minute')->orderBy('id');
    }

    public function matchReferees(): HasMany
    {
        return $this->hasMany(MatchReferee::class, 'match_id');
    }

    public function referees(): HasMany
    {
        return $this->hasMany(MatchReferee::class, 'match_id')->with('referee');
    }

    public function statistics(): HasMany
    {
        return $this->hasMany(MatchStatistic::class, 'match_id');
    }

    public function lineups(): HasMany
    {
        return $this->hasMany(MatchLineup::class, 'match_id');
    }

    public function performances(): HasMany
    {
        return $this->hasMany(PlayerMatchPerformance::class, 'match_id');
    }

    public function media(): HasMany
    {
        return $this->hasMany(MatchMedia::class, 'match_id')->orderBy('order_index');
    }

    public function scopeLive(Builder $query): Builder
    {
        return $query->whereIn('status', MatchStatus::live());
    }

    public function scopeForTeam(Builder $query, int $teamId): Builder
    {
        return $query->where(function (Builder $q) use ($teamId) {
            $q->where('home_team_id', $teamId)->orWhere('away_team_id', $teamId);
        });
    }

    public function scoreFor(int $teamId): int
    {
        return (int) ((int) $teamId === (int) $this->home_team_id ? $this->home_score : $this->away_score);
    }

    public function scoreAgainst(int $teamId): int
    {
        return (int) ((int) $teamId === (int) $this->home_team_id ? $this->away_score : $this->home_score);
    }

    public function opponentTeamFor(int $teamId): ?Team
    {
        return (int) $teamId === (int) $this->home_team_id ? $this->awayTeam : $this->homeTeam;
    }

    public function resultFor(int $teamId): ?string
    {
        $for = $this->scoreFor($teamId);
        $against = $this->scoreAgainst($teamId);

        if ($for > $against) {
            return 'win';
        }

        if ($for < $against) {
            return 'loss';
        }

        return 'draw';
    }

    public function isFinished(): bool
    {
        return $this->status === MatchStatus::Finished;
    }

    /**
     * The active half a live event's minute is relative to: `first` or
     * `second`. Returns null when the match is not in a half period.
     */
    public function currentHalf(): ?string
    {
        return match ($this->status) {
            MatchStatus::FirstHalf => 'first',
            MatchStatus::SecondHalf => 'second',
            default => null,
        };
    }

    public function isHalftime(): bool
    {
        return $this->status === MatchStatus::Halftime;
    }
}
