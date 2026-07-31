<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TerrainBooking extends Model
{
    protected $fillable = [
        'terrain_id',
        'manager_id',
        'team_id',
        'booking_type',
        'flow_type',
        'reservation_type',
        'match_request_id',
        'booking_date',
        'day_of_week',
        'start_date',
        'end_date',
        'start_time',
        'end_time',
        'price',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'booking_date' => 'date',
            'day_of_week' => 'integer',
            'start_date' => 'date',
            'end_date' => 'date',
            'price' => 'decimal:2',
        ];
    }

    protected function startTime(): Attribute
    {
        return Attribute::get(fn ($value) => $value ? substr($value, 0, 5) : null);
    }

    protected function endTime(): Attribute
    {
        return Attribute::get(fn ($value) => $value ? substr($value, 0, 5) : null);
    }

    public function terrain(): BelongsTo
    {
        return $this->belongsTo(Stadium::class, 'terrain_id');
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
    }

    public function matchRequest(): BelongsTo
    {
        return $this->belongsTo(MatchRequest::class, 'match_request_id');
    }

    public function isWeeklySubscription(): bool
    {
        return $this->reservation_type === 'weekly_subscription';
    }

    public function isActiveSubscription(): bool
    {
        if (!$this->isWeeklySubscription()) {
            return false;
        }
        if ($this->status !== 'approved') {
            return false;
        }
        $now = now()->toDateString();
        if ($this->start_date && $now < $this->start_date) {
            return false;
        }
        if ($this->end_date && $now > $this->end_date) {
            return false;
        }
        return true;
    }

    public function coversDate(\Carbon\Carbon $date): bool
    {
        if (!$this->isWeeklySubscription()) {
            return false;
        }
        if ($this->day_of_week !== $date->dayOfWeek) {
            return false;
        }
        if ($this->start_date && $date->lt($this->start_date)) {
            return false;
        }
        if ($this->end_date && $date->gt($this->end_date)) {
            return false;
        }
        return true;
    }

    public function displayDate(): ?\Carbon\Carbon
    {
        if ($this->isWeeklySubscription()) {
            $today = \Carbon\Carbon::today();
            $start = $this->start_date ? $this->start_date->copy() : $today->copy()->startOfWeek();
            $end = $this->end_date ? $this->end_date->copy() : $start->copy()->addMonths(6);
            $dow = $this->day_of_week ?? $start->dayOfWeek;

            $cursor = $start->lt($today) ? $today->copy() : $start->copy();
            $daysAhead = ($dow - $cursor->dayOfWeek + 7) % 7;
            $cursor = $cursor->addDays($daysAhead);

            if ($cursor->isToday() && $this->start_time && now()->format('H:i') >= $this->start_time) {
                $cursor = $cursor->addWeek();
            }

            return $cursor->lte($end) ? $cursor : null;
        }

        return $this->booking_date?->copy();
    }

    public static function checkConflict(int $terrainId, string $date, string $startTime, string $endTime, ?int $excludeId = null): bool
    {
        $checkDate = \Carbon\Carbon::parse($date);
        $dow = $checkDate->dayOfWeek;
        $dateStr = $checkDate->toDateString();

        $conflict = static::where('terrain_id', $terrainId)
            ->whereIn('status', ['pending', 'approved'])
            ->where(function ($q) use ($dow, $dateStr) {
                $q->where(function ($sq) use ($dateStr) {
                    $sq->where('reservation_type', 'single')
                        ->where('booking_date', $dateStr);
                })
                ->orWhere(function ($sq) use ($dow, $dateStr) {
                    $sq->where('reservation_type', 'weekly_subscription')
                        ->where('day_of_week', $dow)
                        ->where(function ($ssq) use ($dateStr) {
                            $ssq->where(function ($fff) use ($dateStr) {
                                $fff->whereNull('start_date')->orWhere('start_date', '<=', $dateStr);
                            });
                            $ssq->where(function ($fff) use ($dateStr) {
                                $fff->whereNull('end_date')->orWhere('end_date', '>=', $dateStr);
                            });
                        });
                });
            })
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime);

        if ($excludeId) {
            $conflict->where('id', '!=', $excludeId);
        }

        return $conflict->exists();
    }

    public static function getConflictMessage(int $terrainId, string $date, string $startTime, string $endTime, ?int $excludeManagerId = null): ?string
    {
        $checkDate = \Carbon\Carbon::parse($date);
        $dow = $checkDate->dayOfWeek;
        $dateStr = $checkDate->toDateString();

        $conflict = static::where('terrain_id', $terrainId)
            ->whereIn('status', ['pending', 'approved'])
            ->when($excludeManagerId, fn ($q) => $q->where('manager_id', '!=', $excludeManagerId))
            ->where(function ($q) use ($dow, $dateStr) {
                $q->where(function ($sq) use ($dateStr) {
                    $sq->where('reservation_type', 'single')
                        ->where('booking_date', $dateStr);
                })
                ->orWhere(function ($sq) use ($dow, $dateStr) {
                    $sq->where('reservation_type', 'weekly_subscription')
                        ->where('day_of_week', $dow)
                        ->where(function ($ssq) use ($dateStr) {
                            $ssq->where(function ($fff) use ($dateStr) {
                                $fff->whereNull('start_date')->orWhere('start_date', '<=', $dateStr);
                            });
                            $ssq->where(function ($fff) use ($dateStr) {
                                $fff->whereNull('end_date')->orWhere('end_date', '>=', $dateStr);
                            });
                        });
                });
            })
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime)
            ->first();

        if (!$conflict) {
            return null;
        }

        return $conflict->reservation_type === 'weekly_subscription'
            ? 'هذا التوقيت محجوز مسبقاً عبر أبونمان أسبوعي'
            : 'هذا الوقت محجوز بالفعل في التاريخ المحدد';
    }
}
