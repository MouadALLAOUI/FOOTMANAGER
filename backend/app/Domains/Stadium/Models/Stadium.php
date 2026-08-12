<?php

namespace App\Domains\Stadium\Models;

use App\Domains\Booking\Models\CancellationPolicy;
use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Booking\Models\TerrainImage;
use App\Domains\Booking\Models\TerrainSchedule;
use App\Domains\Match\Models\MatchRequest;
use App\Domains\Shared\Models\City;
use App\Models\User;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Stadium extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'city',
        'address',
        'description',
        'latitude',
        'longitude',
        'capacity',
        'owner_id',
        'type',
        'player_format',
        'is_covered',
        'has_benches',
        'supports_tournaments',
        'has_lighting',
        'has_vestiaires',
        'price_per_team',
        'price_per_hour',
        'total_price',
        'is_available',
        'is_open',
        'closure_reason',
        'google_maps_url',
        'rating',
        'reviews_count',
        'cover_image',
        'cover_thumbnail_path',
        'cancellation_policy_id',
    ];

    protected $appends = ['cover_image_url', 'cover_thumbnail_url'];

    protected function casts(): array
    {
        return [
            'capacity' => 'integer',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'has_benches' => 'boolean',
            'supports_tournaments' => 'boolean',
            'has_lighting' => 'boolean',
            'has_vestiaires' => 'boolean',
            'is_covered' => 'boolean',
            'price_per_team' => 'decimal:2',
            'price_per_hour' => 'decimal:2',
            'total_price' => 'decimal:2',
            'is_available' => 'boolean',
            'is_open' => 'boolean',
            'rating' => 'decimal:2',
            'reviews_count' => 'integer',
        ];
    }

    protected function serializeDate(DateTimeInterface $date): string
    {
        return $date->format('Y-m-d\TH:i:s');
    }

    public function getCoverImageUrlAttribute(): ?string
    {
        if ($this->cover_image) {
            return Storage::disk('public')->url($this->cover_image);
        }

        return null;
    }

    public function getCoverThumbnailUrlAttribute(): ?string
    {
        if ($this->cover_thumbnail_path) {
            return Storage::disk('public')->url($this->cover_thumbnail_path);
        }
        // Fallback: if no explicit thumbnail, check if cover image has a thumbnail in the images table
        if ($this->cover_image) {
            return Storage::disk('public')->url($this->cover_image);
        }

        return null;
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function matchRequests(): HasMany
    {
        return $this->hasMany(MatchRequest::class, 'stadium_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(TerrainImage::class, 'terrain_id');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(TerrainSchedule::class, 'terrain_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(TerrainBooking::class, 'terrain_id');
    }

    public function facilities(): BelongsToMany
    {
        return $this->belongsToMany(Facility::class, 'facility_terrain', 'terrain_id', 'facility_id');
    }

    public function cancellationPolicy(): BelongsTo
    {
        return $this->belongsTo(CancellationPolicy::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class, 'city_id');
    }
}
