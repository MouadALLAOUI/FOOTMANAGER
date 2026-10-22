<?php

namespace App\Domains\Booking\Models;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Stadium\Models\Stadium;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TerrainBookingOccurrence extends Model
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_USED_BY_MATCH = 'used_by_match';
    public const STATUS_FREED = 'freed';
    public const STATUS_RELEASED = 'released_to_tournament';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_WEATHER_BLOCKED = 'weather_blocked';

    protected $fillable = [
        'terrain_booking_id',
        'occurrence_date',
        'stadium_id',
        'start_time',
        'end_time',
        'status',
        'fixture_id',
        'notes',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'occurrence_date' => 'date',
            'metadata' => 'array',
        ];
    }

    protected function startTime(): Attribute
    {
        return Attribute::get(fn($value) => $value ? substr($value, 0, 5) : null);
    }

    protected function endTime(): Attribute
    {
        return Attribute::get(fn($value) => $value ? substr($value, 0, 5) : null);
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(TerrainBooking::class, 'terrain_booking_id');
    }

    public function stadium(): BelongsTo
    {
        return $this->belongsTo(Stadium::class, 'stadium_id');
    }

    public function fixture(): BelongsTo
    {
        return $this->belongsTo(Fixture::class, 'fixture_id');
    }

    public function isAvailable(): bool
    {
        return in_array($this->status, [self::STATUS_FREED, self::STATUS_CANCELLED], true);
    }

    public function isBlocked(): bool
    {
        return in_array($this->status, [self::STATUS_ACTIVE, self::STATUS_USED_BY_MATCH, self::STATUS_WEATHER_BLOCKED], true);
    }

    /**
     * Revert expired occurrences that were released to tournament teams
     * but reached kickoff time without being booked.
     */
    public static function autoRevertExpiredReleasedOccurrences(): int
    {
        $now = now();
        $todayStr = $now->toDateString();
        $currentTime = $now->format('H:i');

        return static::query()
            ->where('status', self::STATUS_RELEASED)
            ->whereNull('fixture_id')
            ->where(function ($q) use ($todayStr, $currentTime) {
                $q->whereDate('occurrence_date', '<', $todayStr)
                    ->orWhere(function ($sq) use ($todayStr, $currentTime) {
                        $sq->whereDate('occurrence_date', '=', $todayStr)
                            ->where('start_time', '<=', $currentTime);
                    });
            })
            ->update([
                'status' => self::STATUS_ACTIVE,
                'notes' => 'تمت استعادة الموعد تلقائياً بعد مرور توقيت البداية دون حجز',
            ]);
    }
}
