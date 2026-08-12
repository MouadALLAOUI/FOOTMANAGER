<?php

namespace App\Domains\Player\Models;

use App\Domains\Shared\Models\City;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;

class PlayerProfile extends Model
{
    use HasFactory;

    public const AVAILABILITY_AVAILABLE = 'available';

    public const AVAILABILITY_BUSY = 'busy';

    public const AVAILABILITY_VACATION = 'vacation';

    public const AVAILABILITY_INJURED = 'injured';

    public const AVAILABILITY_UNAVAILABLE = 'unavailable';

    public const VISIBILITY_PUBLIC = 'public';

    public const VISIBILITY_PRIVATE = 'private';

    public const CONTACT_VISIBILITY_PUBLIC = 'public';

    public const CONTACT_VISIBILITY_TEAM = 'team';

    public const CONTACT_VISIBILITY_PRIVATE = 'private';

    protected $fillable = [
        'user_id',
        'position',
        'skill_level',
        'birth_year',
        'birth_date',
        'nationality',
        'height_cm',
        'weight_kg',
        'preferred_foot',
        'strong_foot',
        'secondary_positions',
        'preferred_formats',
        'preferred_playing_days',
        'preferred_playing_hours',
        'preferred_cities',
        'city',
        'description',
        'photo_path',
        'photo_thumbnail_path',
        'cover_photo_path',
        'cover_photo_thumbnail_path',
        'is_available',
        'availability_status',
        'visibility',
        'contact_visibility',
        'recruitment_available',
        'language',
        'notification_preferences',
        'points',
        'matches_played',
        'wins',
        'draws',
        'losses',
        'rating',
        'overall_rating',
    ];

    protected $appends = ['photo_url', 'cover_photo_url', 'age', 'photo_thumbnail_url', 'cover_photo_thumbnail_url'];

    protected function casts(): array
    {
        return [
            'birth_year' => 'integer',
            'birth_date' => 'date',
            'height_cm' => 'integer',
            'weight_kg' => 'integer',
            'is_available' => 'boolean',
            'recruitment_available' => 'boolean',
            'secondary_positions' => 'array',
            'preferred_formats' => 'array',
            'preferred_playing_days' => 'array',
            'preferred_playing_hours' => 'array',
            'preferred_cities' => 'array',
            'notification_preferences' => 'array',
            'points' => 'integer',
            'matches_played' => 'integer',
            'wins' => 'integer',
            'draws' => 'integer',
            'losses' => 'integer',
            'rating' => 'decimal:1',
            'overall_rating' => 'decimal:1',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function galleryImages(): HasMany
    {
        return $this->hasMany(PlayerGalleryImage::class, 'user_id', 'user_id');
    }

    public function availabilitySlots(): HasMany
    {
        return $this->hasMany(PlayerAvailabilitySlot::class, 'user_id', 'user_id');
    }

    public function teamHistory(): HasMany
    {
        return $this->hasMany(PlayerTeamHistory::class, 'user_id', 'user_id');
    }

    public function transfers(): HasMany
    {
        return $this->hasMany(PlayerTransfer::class, 'user_id', 'user_id');
    }

    public function statistics(): HasOne
    {
        return $this->hasOne(PlayerStatistic::class, 'user_id', 'user_id');
    }

    public function achievements(): HasMany
    {
        return $this->hasMany(PlayerAchievement::class, 'user_id', 'user_id');
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->resolveUrl($this->photo_path);
    }

    public function getCoverPhotoUrlAttribute(): ?string
    {
        return $this->resolveUrl($this->cover_photo_path);
    }

    public function getPhotoThumbnailUrlAttribute(): ?string
    {
        return $this->resolveUrl($this->photo_thumbnail_path);
    }

    public function getCoverPhotoThumbnailUrlAttribute(): ?string
    {
        return $this->resolveUrl($this->cover_photo_thumbnail_path);
    }

    public function getAgeAttribute(): ?int
    {
        if ($this->birth_date) {
            return $this->birth_date->age;
        }

        if ($this->birth_year) {
            return (int) date('Y') - (int) $this->birth_year;
        }

        return null;
    }

    public function isPubliclyVisible(): bool
    {
        return $this->visibility === self::VISIBILITY_PUBLIC;
    }

    public function isRecruiting(): bool
    {
        return $this->recruitment_available && $this->visibility === self::VISIBILITY_PUBLIC;
    }

    public function isCurrentlyAvailable(): bool
    {
        return $this->availability_status === self::AVAILABILITY_AVAILABLE;
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class, 'city_id');
    }

    private function resolveUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (str_starts_with($path, 'http')) {
            return $path;
        }

        return Storage::disk('public')->url($path);
    }
}
