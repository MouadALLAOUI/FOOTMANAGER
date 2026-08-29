<?php

namespace App\Domains\Booking\Models;

use App\Domains\Booking\Services\SlotAvailabilityService;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Models\MatchRequest;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

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
        'fixture_id',
        'archived_at',
        'price',
        'subtotal',
        'service_fee',
        'total',
        'status',
        'notes',
        'booking_reference',
        'uuid',
        'cancellation_policy_id',
        'payment_required',
        'payment_status',
        'payment_method',
        'payment_provider',
        'expires_at',
        'confirmed_at',
        'cancelled_at',
        'cancellation_reason',
        'refund_percentage',
        'refund_amount',
        'receipt_path',
        'qr_code_path',
        'guest_name',
        'guest_phone',
        'guest_email',
    ];

    protected function casts(): array
    {
        return [
            'booking_date' => 'date',
            'day_of_week' => 'integer',
            'start_date' => 'date',
            'end_date' => 'date',
            'price' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'service_fee' => 'decimal:2',
            'total' => 'decimal:2',
            'payment_required' => 'boolean',
            'refund_percentage' => 'decimal:2',
            'refund_amount' => 'decimal:2',
            'expires_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'archived_at' => 'datetime',
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

    public function fixture(): BelongsTo
    {
        return $this->belongsTo(Fixture::class, 'fixture_id');
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }

    public function cancellationPolicy(): BelongsTo
    {
        return $this->belongsTo(CancellationPolicy::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'booking_id');
    }

    public function latestPayment(): ?Payment
    {
        return $this->payments()->latest()->first();
    }

    public function slotDateTime(): Carbon
    {
        return Carbon::parse($this->booking_date->toDateString() . ' ' . $this->start_time);
    }

    public function isGuest(): bool
    {
        return $this->manager_id === null && $this->guest_name !== null;
    }

    public function isCancelable(): bool
    {
        return in_array($this->status, ['pending', 'confirmed', 'approved'], true)
            && $this->slotDateTime()->isFuture();
    }

    public static function generateReference(): string
    {
        do {
            $reference = 'FMB-' . strtoupper(Str::random(8));
        } while (static::where('booking_reference', $reference)->exists());

        return $reference;
    }

    public function isWeeklySubscription(): bool
    {
        return $this->reservation_type === 'weekly_subscription';
    }

    public function isActiveSubscription(): bool
    {
        if (! $this->isWeeklySubscription()) {
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

    public function coversDate(Carbon $date): bool
    {
        if (! $this->isWeeklySubscription()) {
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

    public function displayDate(): ?Carbon
    {
        if ($this->isWeeklySubscription()) {
            $today = Carbon::today();
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
        return app(SlotAvailabilityService::class)->hasConflict(
            terrainId: $terrainId,
            date: $date,
            startTime: $startTime,
            endTime: $endTime,
            statuses: SlotAvailabilityService::CONFLICT_STATUSES,
            excludeId: $excludeId,
        );
    }

    public static function getConflictMessage(int $terrainId, string $date, string $startTime, string $endTime, ?int $excludeManagerId = null, ?int $excludeId = null): ?string
    {
        return app(SlotAvailabilityService::class)->conflictMessage(
            terrainId: $terrainId,
            date: $date,
            startTime: $startTime,
            endTime: $endTime,
            statuses: SlotAvailabilityService::CONFLICT_STATUSES,
            excludeId: $excludeId,
            excludeManagerId: $excludeManagerId,
        );
    }
}
