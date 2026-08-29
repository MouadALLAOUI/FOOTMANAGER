<?php

namespace App\Domains\Competition\Models;

use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchEvent;
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
    ];

    protected function casts(): array
    {
        return [
            'status' => FixtureStatus::class,
            'scheduled_at' => 'datetime',
        ];
    }

    public function competition(): BelongsTo
    {
        return $this->belongsTo(Competition::class);
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
}
