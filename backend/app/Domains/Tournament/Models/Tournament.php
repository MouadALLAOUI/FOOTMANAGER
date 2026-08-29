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
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Tournament extends Model
{
    public const STATUS_DRAFT = 'draft';

    public const STATUS_OPEN_FOR_REGISTRATION = 'open_for_registration';

    public const STATUS_REGISTRATION_CLOSED = 'registration_closed';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    public const CARD_ACCUMULATION_DISABLED = 'disabled';

    public const CARD_ACCUMULATION_GROUP = 'group';

    public const CARD_ACCUMULATION_TOURNAMENT = 'tournament';

    /**
     * Statuses during which the draw and team list are still editable.
     *
     * @var array<int, string>
     */
    public const STATUSES_EDITABLE = [
        self::STATUS_DRAFT,
        self::STATUS_OPEN_FOR_REGISTRATION,
        self::STATUS_REGISTRATION_CLOSED,
    ];

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
        'rules',
        'logo_path',
        'cover_path',
        'primary_color',
        'secondary_color',
        'location',
        'start_date',
        'end_date',
        'registration_start_at',
        'registration_end_at',
        'registration_fee',
        'status',
        'tournament_format',
        'teams_count',
        'groups_count',
        'teams_per_group',
        'max_players_per_team',
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
        'card_accumulation',
        'published_at',
        'draw_confirmed_at',
        'plan',
        'contact_phone',
        'contact_email',
        'whatsapp_number',
        'facebook_url',
        'instagram_url',
        'tiktok_url',
        'youtube_url',
        'hidden_at',
    ];

    protected function casts(): array
    {
        return [
            'uuid' => 'string',
            'start_date' => 'date',
            'end_date' => 'date',
            'registration_start_at' => 'datetime',
            'registration_end_at' => 'datetime',
            'registration_fee' => 'decimal:2',
            'teams_count' => 'integer',
            'groups_count' => 'integer',
            'teams_per_group' => 'integer',
            'max_players_per_team' => 'integer',
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
            'hidden_at' => 'datetime',
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

    public function allRegistrations(): HasMany
    {
        return $this->hasMany(TournamentTeam::class);
    }

    public function squadMembers(): HasMany
    {
        return $this->hasMany(TournamentSquadMember::class);
    }

    public function pendingRegistrations(): HasMany
    {
        return $this->hasMany(TournamentTeam::class)->where('status', TournamentTeam::STATUS_PENDING);
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

    public function news(): HasMany
    {
        return $this->hasMany(TournamentNews::class, 'tournament_id');
    }

    public function galleryImages(): HasMany
    {
        return $this->hasMany(TournamentGalleryImage::class, 'tournament_id');
    }

    public function sponsors(): HasMany
    {
        return $this->hasMany(TournamentSponsor::class, 'tournament_id');
    }

    public function partners(): HasMany
    {
        return $this->hasMany(TournamentPartner::class, 'tournament_id');
    }

    public function contactMessages(): HasMany
    {
        return $this->hasMany(TournamentContactMessage::class, 'tournament_id');
    }

    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo_path
            ? Storage::disk('public')->url($this->logo_path)
            : null;
    }

    public function getCoverUrlAttribute(): ?string
    {
        return $this->cover_path
            ? Storage::disk('public')->url($this->cover_path)
            : null;
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isOpenForRegistration(): bool
    {
        return $this->status === self::STATUS_OPEN_FOR_REGISTRATION;
    }

    public function isRegistrationClosed(): bool
    {
        return $this->status === self::STATUS_REGISTRATION_CLOSED;
    }

    public function isInProgress(): bool
    {
        return $this->status === self::STATUS_IN_PROGRESS;
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    public function isEditable(): bool
    {
        return in_array($this->status, self::STATUSES_EDITABLE, true);
    }

    public function isVisiblePublicly(): bool
    {
        return in_array($this->status, [
            self::STATUS_OPEN_FOR_REGISTRATION,
            self::STATUS_REGISTRATION_CLOSED,
            self::STATUS_IN_PROGRESS,
            self::STATUS_COMPLETED,
        ], true) && ! $this->isHidden();
    }

    public function isHidden(): bool
    {
        return $this->hidden_at !== null;
    }

    public function isAccessiblePublicly(): bool
    {
        return $this->isVisiblePublicly() && ! $this->isHidden();
    }

    public function scopeVisible($query)
    {
        return $query->whereNull('hidden_at');
    }

    public function scopeHidden($query)
    {
        return $query->whereNotNull('hidden_at');
    }

    public function registrationRequiresFee(): bool
    {
        return $this->registration_fee > 0;
    }

    public function registrationWindowPassed(): bool
    {
        return $this->registration_end_at !== null && $this->registration_end_at->isPast();
    }

    public function registrationWindowOpen(): bool
    {
        if ($this->registration_start_at && $this->registration_start_at->isFuture()) {
            return false;
        }

        return ! $this->registrationWindowPassed();
    }

    public function canRegister(): bool
    {
        return $this->isOpenForRegistration() && $this->registrationWindowOpen();
    }

    public function registeredTeamsCount(): int
    {
        return $this->tournamentTeams()->count();
    }

    public function cardAccumulationEnabled(): bool
    {
        return $this->card_accumulation !== self::CARD_ACCUMULATION_DISABLED;
    }

    public function accumulatesAcrossGroupStageOnly(): bool
    {
        return $this->card_accumulation === self::CARD_ACCUMULATION_GROUP;
    }
}
