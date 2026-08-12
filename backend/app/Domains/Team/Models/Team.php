<?php

namespace App\Domains\Team\Models;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Match\Models\MatchRequest;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Models\City;
use App\Domains\Stadium\Models\Stadium;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Team extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'name',
        'is_free',
        'logo_url',
        'logo_path',
        'logo_thumbnail_path',
        'cover_image_path',
        'cover_thumbnail_path',
        'member_count',
        'category',
        'level',
        'association_name',
        'city',
        'region',
        'founded_year',
        'max_squad_size',
        'visibility',
        'preferred_formats',
        'social_links',
        'description',
        'primary_color',
        'secondary_color',
        'primary_stadium_id',
        'points',
        'matches_played',
        'wins',
        'draws',
        'losses',
        'goals_for',
        'goals_against',
        'goal_difference',
        'manager_id',
        'captain_id',
        'vice_captain_id',
    ];

    protected function casts(): array
    {
        return [
            'member_count' => 'integer',
            'points' => 'integer',
            'matches_played' => 'integer',
            'wins' => 'integer',
            'draws' => 'integer',
            'losses' => 'integer',
            'goals_for' => 'integer',
            'goals_against' => 'integer',
            'goal_difference' => 'integer',
            'founded_year' => 'integer',
            'max_squad_size' => 'integer',
            'preferred_formats' => 'array',
            'social_links' => 'array',
        ];
    }

    public function getLogoUrlAttribute(): ?string
    {
        if ($this->logo_path) {
            return Storage::disk('public')->url($this->logo_path);
        }

        return $this->attributes['logo_url'] ?? null;
    }

    public function getCoverImageUrlAttribute(): ?string
    {
        return $this->cover_image_path
            ? Storage::disk('public')->url($this->cover_image_path)
            : null;
    }

    public function getLogoThumbnailUrlAttribute(): ?string
    {
        return $this->logo_thumbnail_path
            ? Storage::disk('public')->url($this->logo_thumbnail_path)
            : null;
    }

    public function getCoverThumbnailUrlAttribute(): ?string
    {
        return $this->cover_thumbnail_path
            ? Storage::disk('public')->url($this->cover_thumbnail_path)
            : null;
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function captain(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'captain_id');
    }

    public function viceCaptain(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'vice_captain_id');
    }

    public function primaryStadium(): BelongsTo
    {
        return $this->belongsTo(Stadium::class, 'primary_stadium_id');
    }

    public function hostedMatches(): HasMany
    {
        return $this->hasMany(MatchRequest::class, 'host_team_id');
    }

    public function opponentMatches(): HasMany
    {
        return $this->hasMany(MatchRequest::class, 'opponent_team_id');
    }

    public function players(): HasMany
    {
        return $this->hasMany(Player::class, 'team_id');
    }

    public function terrainBookings(): HasMany
    {
        return $this->hasMany(TerrainBooking::class, 'team_id');
    }

    public function galleryImages(): HasMany
    {
        return $this->hasMany(TeamGalleryImage::class, 'team_id')->orderByDesc('is_cover')->orderBy('order_index')->orderByDesc('created_at');
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(Attendance::class, 'team_id');
    }

    public function announcements(): HasMany
    {
        return $this->hasMany(TeamAnnouncement::class, 'team_id')->latest();
    }

    public function formation(): HasOne
    {
        return $this->hasOne(TeamFormation::class, 'team_id')
            ->where('is_active', true)
            ->latestOfMany();
    }

    public function isPublic(): bool
    {
        return $this->visibility === 'public';
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class, 'city_id');
    }
}
