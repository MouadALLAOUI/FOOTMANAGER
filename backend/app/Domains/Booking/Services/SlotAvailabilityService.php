<?php

namespace App\Domains\Booking\Services;

use App\Domains\Booking\Models\TerrainBooking;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Single source of truth for booking time-slot conflict detection.
 *
 * Consumers keep their own exclusion semantics (id / manager_id / dayOfWeek)
 * so the shared window query never changes observable behaviour, but all of
 * them classify a booking as conflicting using CONFLICT_STATUSES.
 */
class SlotAvailabilityService
{
    /** Statuses considered conflicts by every consumer (model helpers, calendar, rules). */
    public const CONFLICT_STATUSES = ['pending', 'confirmed', 'approved'];

    /**
     * Build the overlapping-window query for a terrain on a given date.
     *
     * Handles both single (exact booking_date) and weekly_subscription
     * (day_of_week + start/end date coverage) reservations that overlap the
     * requested [startTime, endTime) window.
     */
    public function query(
        int $terrainId,
        string $date,
        string $startTime,
        string $endTime,
        array $statuses = self::CONFLICT_STATUSES,
        ?int $excludeId = null,
        ?int $excludeManagerId = null,
        ?int $dayOfWeek = null,
    ): Builder {
        $checkDate = Carbon::parse($date);
        $dow = $dayOfWeek ?? $checkDate->dayOfWeek;
        $dateStr = $checkDate->toDateString();

        return TerrainBooking::query()
            ->where('terrain_id', $terrainId)
            ->whereIn('status', $statuses)
            ->when($excludeId, fn (Builder $q) => $q->where('id', '!=', $excludeId))
            ->when($excludeManagerId, fn (Builder $q) => $q->where('manager_id', '!=', $excludeManagerId))
            ->where(function (Builder $q) use ($dow, $dateStr) {
                $q->where(function (Builder $sq) use ($dateStr) {
                    $sq->where('reservation_type', 'single')
                        ->where('booking_date', $dateStr);
                })
                    ->orWhere(function (Builder $sq) use ($dow, $dateStr) {
                        $sq->where('reservation_type', 'weekly_subscription')
                            ->where('day_of_week', $dow)
                            ->where(function (Builder $ssq) use ($dateStr) {
                                $ssq->where(function (Builder $fff) use ($dateStr) {
                                    $fff->whereNull('start_date')
                                        ->orWhere('start_date', '<=', $dateStr);
                                });
                                $ssq->where(function (Builder $fff) use ($dateStr) {
                                    $fff->whereNull('end_date')
                                        ->orWhere('end_date', '>=', $dateStr);
                                });
                            });
                    });
            })
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime);
    }

    public function hasConflict(
        int $terrainId,
        string $date,
        string $startTime,
        string $endTime,
        array $statuses = self::CONFLICT_STATUSES,
        ?int $excludeId = null,
        ?int $excludeManagerId = null,
        ?int $dayOfWeek = null,
    ): bool {
        return $this->query(
            terrainId: $terrainId,
            date: $date,
            startTime: $startTime,
            endTime: $endTime,
            statuses: $statuses,
            excludeId: $excludeId,
            excludeManagerId: $excludeManagerId,
            dayOfWeek: $dayOfWeek,
        )->exists();
    }

    public function firstConflict(
        int $terrainId,
        string $date,
        string $startTime,
        string $endTime,
        array $statuses = self::CONFLICT_STATUSES,
        ?int $excludeId = null,
        ?int $excludeManagerId = null,
        ?int $dayOfWeek = null,
    ): ?TerrainBooking {
        return $this->query(
            terrainId: $terrainId,
            date: $date,
            startTime: $startTime,
            endTime: $endTime,
            statuses: $statuses,
            excludeId: $excludeId,
            excludeManagerId: $excludeManagerId,
            dayOfWeek: $dayOfWeek,
        )->first();
    }

    public function conflictMessage(
        int $terrainId,
        string $date,
        string $startTime,
        string $endTime,
        array $statuses = self::CONFLICT_STATUSES,
        ?int $excludeId = null,
        ?int $excludeManagerId = null,
        ?int $dayOfWeek = null,
    ): ?string {
        $conflict = $this->firstConflict(
            terrainId: $terrainId,
            date: $date,
            startTime: $startTime,
            endTime: $endTime,
            statuses: $statuses,
            excludeId: $excludeId,
            excludeManagerId: $excludeManagerId,
            dayOfWeek: $dayOfWeek,
        );

        if (! $conflict) {
            return null;
        }

        // Intended user-facing text (previously corrupted by an encoding bug).
        return $conflict->reservation_type === 'weekly_subscription'
            ? 'هذا التوقيت محجوز مسبقاً عبر أبونمان أسبوعي.'
            : 'هذا الوقت محجوز بالفعل في التاريخ المحدد.';
    }
}
