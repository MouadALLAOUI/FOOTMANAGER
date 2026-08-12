<?php

namespace App\Domains\Tournament\Models;

use App\Domains\Competition\Models\Competition;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Competition\Models\Group;
use App\Domains\Competition\Models\Round;
use App\Domains\Competition\Models\Season;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Shared\Base\Model;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Tournament extends Model
{
    protected $fillable = [
        'uuid',
        'organizer_id',
        'competition_id',
        'season_id',
        'stadium_id',
        'name',
        'slug',
        'edition',
        'category',
        'description',
        'logo_path',
        'location',
        'start_date',
        'end_date',
        'status',
        'tournament_format',
        'teams_count',
        'groups_count',
        'teams_per_group',
        'group_mode',
        'match_duration_minutes',
        'matches_per_day',
        'knockout_teams',
        'qualify_per_group',
        'points_for_win',
        'points_for_draw',
        'points_for_loss',
        'qualification_rules',
        'tiebreaker_rules',
        'published_at',
        'draw_confirmed_at',
        'plan',
    ];

    protected function casts(): array
    {
        return [
            'uuid' => 'string',
            'start_date' => 'date',
            'end_date' => 'date',
            'teams_count' => 'integer',
            'groups_count' => 'integer',
            'teams_per_group' => 'integer',
            'match_duration_minutes' => 'integer',
            'matches_per_day' => 'integer',
            'points_for_win' => 'integer',
            'points_for_draw' => 'integer',
            'points_for_loss' => 'integer',
            'qualify_per_group' => 'integer',
            'qualification_rules' => 'array',
            'tiebreaker_rules' => 'array',
            'plan' => 'array',
            'published_at' => 'datetime',
            'draw_confirmed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Tournament $tournament) {
            $tournament->uuid ??= (string) Str::uuid();
            $tournament->slug ??= Str::slug($tournament->name).'-'.Str::lower(Str::random(6));
        });
    }

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    public function competition(): BelongsTo
    {
        return $this->belongsTo(Competition::class);
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(Season::class, 'season_id');
    }

    public function stadium(): BelongsTo
    {
        return $this->belongsTo(Stadium::class, 'stadium_id');
    }

    public function tournamentTeams(): HasMany
    {
        return $this->hasMany(TournamentTeam::class)->where('status', TournamentTeam::STATUS_REGISTERED)->orderBy('group_id')->orderBy('group_position');
    }

    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'tournament_teams')
            ->wherePivot('status', TournamentTeam::STATUS_REGISTERED)
            ->withPivot(['group_id', 'group_position', 'id']);
    }

    public function tournamentStadiums(): HasMany
    {
        return $this->hasMany(TournamentStadium::class);
    }

    public function stadiums(): BelongsToMany
    {
        return $this->belongsToMany(Stadium::class, 'tournament_stadiums');
    }

    public function groups(): HasMany
    {
        return $this->hasMany(Group::class, 'competition_id', 'competition_id')
            ->orderBy('name');
    }

    public function rounds(): HasMany
    {
        return $this->hasMany(Round::class, 'competition_id', 'competition_id')
            ->orderBy('order_index');
    }

    public function fixtures(): HasMany
    {
        return $this->hasMany(Fixture::class, 'competition_id', 'competition_id');
    }

    public function matches(): HasMany
    {
        return $this->hasMany(FootballMatch::class, 'competition_id', 'competition_id');
    }

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }
}
