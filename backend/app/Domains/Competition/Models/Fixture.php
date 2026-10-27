<?php

namespace App\Domains\Competition\Models;

use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchEvent;
use App\Domains\Match\Models\PenaltyAward;
use App\Domains\Match\Models\PlayerPenalty;
use App\Domains\Shared\Base\Model;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Fixture extends Model
{
    protected $fillable = [
        'competition_id',
        'season_id',
        'round_id',
        'matchday',
        'group_id',
        'match_id',
        'stadium_id',
        'home_team_id',
        'away_team_id',
        'bye_team_id',
        'source_home_fixture_id',
        'source_away_fixture_id',
        'scheduled_at',
        'status',
        'unscheduled_reason',
        'postponement_reason',
        'postponement_note',
        'postponed_from_date',
        'is_rescheduled',
        'slot_note',
        'last_change_payload',
    ];

    protected function casts(): array
    {
        return [
            'status' => FixtureStatus::class,
            'scheduled_at' => 'datetime',
            'postponed_from_date' => 'datetime',
            'is_rescheduled' => 'boolean',
            'last_change_payload' => 'array',
        ];
    }

    public function competition(): BelongsTo
    {
        return $this->belongsTo(Competition::class);
    }

    public function tournament(): BelongsTo
    {
        return $this->competition();
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(Season::class);
    }

    public function round(): BelongsTo
    {
        return $this->belongsTo(Round::class);
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(FootballMatch::class, 'match_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(MatchEvent::class, 'match_id', 'match_id');
    }

    /**
     * Time penalties and penalty-shot awards for the fixture's match.
     *
     * These back Laravel's scoped implicit child route binding for the
     * `penalties/player/{penalty}` and `penalties/award/{award}` routes, so the
     * child record is resolved and scoped to this fixture's match.
     */
    public function penalties(): HasMany
    {
        return $this->hasMany(PlayerPenalty::class, 'match_id', 'match_id');
    }

    public function awards(): HasMany
    {
        return $this->hasMany(PenaltyAward::class, 'match_id', 'match_id');
    }

    public function stadium(): BelongsTo
    {
        return $this->belongsTo(Stadium::class, 'stadium_id');
    }

    public function homeTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'home_team_id')->withTrashed();
    }

    public function awayTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'away_team_id')->withTrashed();
    }

    public function sourceHomeFixture(): BelongsTo
    {
        return $this->belongsTo(Fixture::class, 'source_home_fixture_id');
    }

    public function sourceAwayFixture(): BelongsTo
    {
        return $this->belongsTo(Fixture::class, 'source_away_fixture_id');
    }

    public function byeTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'bye_team_id')->withTrashed();
    }

    public function delegatedToken(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(\App\Domains\Match\Models\MatchDelegatedToken::class, 'fixture_id')
            ->where('is_revoked', false)
            ->latestOfMany();
    }

    public function delegatedSubmissions(): HasMany
    {
        return $this->hasMany(\App\Domains\Match\Models\MatchDelegatedSubmission::class, 'fixture_id');
    }

    public function latestPendingSubmission(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(\App\Domains\Match\Models\MatchDelegatedSubmission::class, 'fixture_id')
            ->where('status', 'pending')
            ->latestOfMany();
    }

    public function ensureMatch(): FootballMatch
    {
        if ($this->match_id && $this->match) {
            return $this->match;
        }

        if ($this->match_id) {
            $existing = FootballMatch::find($this->match_id);
            if ($existing) {
                return $existing;
            }
        }

        $match = FootballMatch::create([
            'competition_id' => $this->competition_id,
            'season_id' => $this->season_id,
            'round_id' => $this->round_id,
            'group_id' => $this->group_id,
            'home_team_id' => $this->home_team_id,
            'away_team_id' => $this->away_team_id,
            'stadium_id' => $this->stadium_id,
            'status' => \App\Domains\Match\Enums\MatchStatus::Scheduled,
            'current_period' => 'upcoming',
            'created_by' => $this->competition?->organizer_id,
        ]);

        $this->forceFill(['match_id' => $match->id])->saveQuietly();

        return $match;
    }

    public function publicToken(): ?string
    {
        if ($this->match) {
            return $this->match->ensurePublicToken();
        }

        if ($this->match_id) {
            return $this->ensureMatch()->ensurePublicToken();
        }

        return null;
    }

    public function publicUrl(): ?string
    {
        $token = $this->publicToken();

        if (! $token) {
            return null;
        }

        $baseUrl = rtrim(config('app.frontend_url') ?: config('app.url') ?: 'https://ajin9essro.com', '/');

        return "{$baseUrl}/live/{$token}";
    }
}
