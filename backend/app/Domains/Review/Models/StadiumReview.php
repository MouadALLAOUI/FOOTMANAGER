<?php

namespace App\Domains\Review\Models;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Shared\Base\Model;
use App\Domains\Stadium\Models\Stadium;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StadiumReview extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_HIDDEN = 'hidden';

    protected $fillable = [
        'stadium_id',
        'user_id',
        'booking_id',
        'overall_rating',
        'field_quality',
        'lighting',
        'cleanliness',
        'facilities',
        'parking',
        'comment',
        'photos',
        'recommend',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'overall_rating' => 'integer',
            'field_quality' => 'integer',
            'lighting' => 'integer',
            'cleanliness' => 'integer',
            'facilities' => 'integer',
            'parking' => 'integer',
            'photos' => 'array',
            'recommend' => 'boolean',
        ];
    }

    public function stadium(): BelongsTo
    {
        return $this->belongsTo(Stadium::class, 'stadium_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(TerrainBooking::class, 'booking_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }
}
