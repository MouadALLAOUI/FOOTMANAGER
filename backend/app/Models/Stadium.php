<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use DateTimeInterface;

class Stadium extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'city',
        'address',
        'capacity',
        'owner_id',
        'type',
        'player_format',
        'has_benches',
        'supports_tournaments',
        'has_lighting',
        'has_vestiaires',
        'price_per_team',
        'total_price',
        'is_available',
        'is_open',
        'closure_reason',
        'google_maps_url',
    ];

    protected function casts(): array
    {
        return [
            'capacity' => 'integer',
            'has_benches' => 'boolean',
            'supports_tournaments' => 'boolean',
            'has_lighting' => 'boolean',
            'has_vestiaires' => 'boolean',
            'price_per_team' => 'decimal:2',
            'total_price' => 'decimal:2',
            'is_available' => 'boolean',
            'is_open' => 'boolean',
        ];
    }

    protected function serializeDate(DateTimeInterface $date): string
    {
        return $date->format('Y-m-d\TH:i:s');
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
}
