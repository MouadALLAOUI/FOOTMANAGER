<?php

namespace App\Domains\Booking\Services;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Booking\Models\TerrainBookingOccurrence;
use App\Domains\Booking\Models\TerrainSchedule;
use App\Domains\Booking\Models\TerrainSlotClosure;
use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Stadium\Models\Stadium;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Single source of truth for booking time-slot conflict detection and availability.
 *
 * Used uniformly across:
 * - BookingController@getTerrainSlots (booking form slots)
 * - BookingController@getOwnerCalendar (stadium calendar)
 * - CalendarSlotService (date and week slots)
 * - Booking validations (direct, training, guest, tournament reservations)
 * - Tournament slot pools and suggestions
 */
class SlotAvailabilityService
{
    /** Statuses considered conflicts by every consumer. */
    public const CONFLICT_STATUSES = ['pending', 'confirmed', 'approved'];

    /**
     * Invalidate cached availability for a terrain.
     */
    public static function invalidate(int $terrainId, ?string $date = null): void
    {
        Cache::forget("terrain_cal_{$terrainId}");
        if ($date) {
            Cache::forget("terrain_slots_{$terrainId}_{$date}");
        } else {
            $today = Carbon::today();
            for ($i = 0; $i <= 60; $i++) {
                Cache::forget("terrain_slots_{$terrainId}_" . $today->copy()->addDays($i)->toDateString());
            }
        }
    }

    /**
     * Build the overlapping-window query for a terrain on a given date.
     *
     * Correctly respects:
     * - whereNull('archived_at') and whereNull('cancelled_at')
     * - Date-specific occurrence exceptions for weekly subscriptions (freed / cancelled occurrences do NOT block)
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
        ?int $forTournamentId = null,
    ): Builder {
        $checkDate = Carbon::parse($date);
        $dow = $dayOfWeek ?? $checkDate->dayOfWeek;
        $dateStr = $checkDate->toDateString();

        return TerrainBooking::query()
            ->where('terrain_id', $terrainId)
            ->whereIn('status', $statuses)
            ->whereNull('archived_at')
            ->whereNull('cancelled_at')
            ->when($excludeId, fn (Builder $q) => $q->where('id', '!=', $excludeId))
            ->when($excludeManagerId, fn (Builder $q) => $q->where('manager_id', '!=', $excludeManagerId))
            ->where(function (Builder $q) use ($dow, $dateStr, $forTournamentId) {
                // 1. Single booking on this exact date
                $q->where(function (Builder $sq) use ($dateStr) {
                    $sq->where('reservation_type', 'single')
                        ->where('booking_date', $dateStr);
                })
                // 2. Active weekly subscription covering this day of week,
                // UNLESS an occurrence on this exact date was cancelled or freed
                ->orWhere(function (Builder $sq) use ($dow, $dateStr, $forTournamentId) {
                    $sq->where('reservation_type', 'weekly_subscription')
                        ->where('day_of_week', $dow)
                        ->where(function (Builder $ssq) use ($dateStr) {
                            $ssq->whereNull('start_date')
                                ->orWhere('start_date', '<=', $dateStr);
                        })
                        ->where(function (Builder $ssq) use ($dateStr) {
                            $ssq->whereNull('end_date')
                                ->orWhere('end_date', '>=', $dateStr);
                        })
                        ->whereDoesntHave('occurrences', function (Builder $oq) use ($dateStr, $forTournamentId) {
                            $oq->where('occurrence_date', $dateStr)
                                ->where(function (Builder $sq) use ($forTournamentId) {
                                    $sq->whereIn('status', [
                                        TerrainBookingOccurrence::STATUS_FREED,
                                        TerrainBookingOccurrence::STATUS_CANCELLED,
                                    ]);
                                    if ($forTournamentId) {
                                        $sq->orWhere(function (Builder $tsq) use ($forTournamentId) {
                                            $tsq->where('status', TerrainBookingOccurrence::STATUS_RELEASED)
                                                ->where('metadata->tournament_id', $forTournamentId);
                                        });
                                    }
                                });
                        });
                });
            })
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime);
    }

    /**
     * Check if a slot window has a conflict (booking, closure, or tournament match).
     */
    public function hasConflict(
        int $terrainId,
        string $date,
        string $startTime,
        string $endTime,
        array $statuses = self::CONFLICT_STATUSES,
        ?int $excludeId = null,
        ?int $excludeManagerId = null,
        ?int $dayOfWeek = null,
        ?int $excludeFixtureId = null,
        ?int $forTournamentId = null,
    ): bool {
        // 1. Check bookings
        $hasBooking = $this->query(
            terrainId: $terrainId,
            date: $date,
            startTime: $startTime,
            endTime: $endTime,
            statuses: $statuses,
            excludeId: $excludeId,
            excludeManagerId: $excludeManagerId,
            dayOfWeek: $dayOfWeek,
            forTournamentId: $forTournamentId,
        )->exists();

        if ($hasBooking) {
            return true;
        }

        $dateStr = Carbon::parse($date)->toDateString();

        // 2. Check closures
        $hasClosure = TerrainSlotClosure::query()
            ->where('terrain_id', $terrainId)
            ->where('closure_date', $dateStr)
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime)
            ->exists();

        if ($hasClosure) {
            return true;
        }

        // 3. Check weather-blocked occurrences
        $hasWeatherBlock = TerrainBookingOccurrence::query()
            ->where('stadium_id', $terrainId)
            ->where('occurrence_date', $dateStr)
            ->where('status', TerrainBookingOccurrence::STATUS_WEATHER_BLOCKED)
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime)
            ->exists();

        if ($hasWeatherBlock) {
            return true;
        }

        // 4. Check active scheduled fixtures
        $hasFixture = Fixture::query()
            ->with(['match:id,match_duration_minutes'])
            ->where('stadium_id', $terrainId)
            ->whereDate('scheduled_at', $dateStr)
            ->whereNotIn('status', [FixtureStatus::Cancelled, FixtureStatus::Postponed])
            ->when($excludeFixtureId, fn ($q) => $q->where('id', '!=', $excludeFixtureId))
            ->get(['id', 'competition_id', 'match_id', 'scheduled_at'])
            ->contains(function (Fixture $f) use ($startTime, $endTime) {
                $fStart = Carbon::parse($f->scheduled_at);
                $duration = (int) ($f->match?->match_duration_minutes ?? 60);
                $fEnd = $fStart->copy()->addMinutes($duration);
                return $fStart->format('H:i') < $endTime && $fEnd->format('H:i') > $startTime;
            });

        return $hasFixture;
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
        ?int $excludeFixtureId = null,
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

        if ($conflict) {
            if ($conflict->reservation_type === 'weekly_subscription') {
                $teamName = $conflict->team?->name;
                return $teamName ? "هذا التوقيت محجوز مسبقاً عبر أبونمان أسبوعي لفريق ({$teamName})." : 'هذا التوقيت محجوز مسبقاً عبر أبونمان أسبوعي.';
            }
            $teamName = $conflict->team?->name ?? $conflict->guest_name;
            return $teamName ? "هذا الوقت محجوز بالفعل لصالح ({$teamName})." : 'هذا الوقت محجوز بالفعل في التاريخ المحدد.';
        }

        $dateStr = Carbon::parse($date)->toDateString();

        $closure = TerrainSlotClosure::query()
            ->where('terrain_id', $terrainId)
            ->where('closure_date', $dateStr)
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime)
            ->first();

        if ($closure) {
            return $closure->reason ? "الملعب مغلق في هذا التوقيت: {$closure->reason}" : 'الملعب مغلق في هذا التوقيت.';
        }

        $weatherBlock = TerrainBookingOccurrence::query()
            ->where('stadium_id', $terrainId)
            ->where('occurrence_date', $dateStr)
            ->where('status', TerrainBookingOccurrence::STATUS_WEATHER_BLOCKED)
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime)
            ->first();

        if ($weatherBlock) {
            return 'الموعد مغلق بسبب الأحوال الجوية / ظروف أرضية الملعب.';
        }

        $fixture = Fixture::query()
            ->with(['match:id,match_duration_minutes', 'homeTeam:id,name', 'awayTeam:id,name'])
            ->where('stadium_id', $terrainId)
            ->whereDate('scheduled_at', $dateStr)
            ->whereNotIn('status', [FixtureStatus::Cancelled, FixtureStatus::Postponed])
            ->when($excludeFixtureId, fn ($q) => $q->where('id', '!=', $excludeFixtureId))
            ->get()
            ->first(function (Fixture $f) use ($startTime, $endTime) {
                $fStart = Carbon::parse($f->scheduled_at);
                $duration = (int) ($f->match?->match_duration_minutes ?? 60);
                $fEnd = $fStart->copy()->addMinutes($duration);
                return $fStart->format('H:i') < $endTime && $fEnd->format('H:i') > $startTime;
            });

        if ($fixture) {
            $matchLabel = ($fixture->homeTeam?->name && $fixture->awayTeam?->name)
                ? "هذا التوقيت محجوز لمباراة بطولة ({$fixture->homeTeam->name} ضد {$fixture->awayTeam->name})."
                : 'هذا التوقيت محجوز لمباراة رسمية ضمن البطولة.';
            return $matchLabel;
        }

        return null;
    }

    /**
     * Compute comprehensive slot availability for a stadium on a specific date.
     * Returns all slots (available, booked, and closed) with full metadata and reasons.
     *
     * @return array<string, mixed>
     */
    public function getDetailedSlotsForDate(
        Stadium $terrain,
        string $date,
        ?int $excludeFixtureId = null,
        ?int $excludeBookingId = null,
        ?int $forTournamentId = null,
    ): array {
        if (! $terrain->is_open) {
            return [
                'terrain' => $terrain->only(['id', 'name', 'type', 'player_format', 'price_per_team', 'is_open', 'closure_reason']),
                'slots' => [],
                'terrain_closed' => true,
                'closure_reason' => $terrain->closure_reason ?: 'الملعب مغلق حالياً',
                'message' => 'الملعب مغلق حالياً',
            ];
        }

        $dateObj = Carbon::parse($date);
        $dayOfWeek = $dateObj->dayOfWeek;
        $dateStr = $dateObj->toDateString();

        $schedule = TerrainSchedule::where('terrain_id', $terrain->id)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_active', true)
            ->first();

        if (! $schedule) {
            return [
                'terrain' => $terrain->only(['id', 'name', 'type', 'player_format', 'price_per_team', 'is_open', 'closure_reason']),
                'slots' => [],
                'message' => 'الملعب غير متاح في هذا اليوم (خارج أوقات العمل)',
            ];
        }

        // Auto-revert any expired released occurrences before calculating availability
        TerrainBookingOccurrence::autoRevertExpiredReleasedOccurrences();

        $rawSlots = $this->generateSlots(
            $schedule->open_time,
            $schedule->close_time,
            $schedule->slot_duration_minutes ?: 60,
        );

        // 1. Single active bookings for this date
        $singleBookings = TerrainBooking::where('terrain_id', $terrain->id)
            ->where('reservation_type', 'single')
            ->where('booking_date', $dateStr)
            ->whereIn('status', self::CONFLICT_STATUSES)
            ->whereNull('archived_at')
            ->whereNull('cancelled_at')
            ->when($excludeBookingId, fn ($q) => $q->where('id', '!=', $excludeBookingId))
            ->when($excludeFixtureId, fn ($q) => $q->where('fixture_id', '!=', $excludeFixtureId))
            ->with(['manager', 'team'])
            ->get();

        // 2. Weekly subscriptions covering this day of week
        $weeklySubscriptions = TerrainBooking::where('terrain_id', $terrain->id)
            ->where('reservation_type', 'weekly_subscription')
            ->where('day_of_week', $dayOfWeek)
            ->whereIn('status', self::CONFLICT_STATUSES)
            ->whereNull('archived_at')
            ->whereNull('cancelled_at')
            ->when($excludeBookingId, fn ($q) => $q->where('id', '!=', $excludeBookingId))
            ->where(function ($q) use ($dateStr) {
                $q->whereNull('start_date')->orWhere('start_date', '<=', $dateStr);
            })
            ->where(function ($q) use ($dateStr) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', $dateStr);
            })
            ->with(['manager', 'team', 'occurrences' => fn ($oq) => $oq->where('occurrence_date', $dateStr)])
            ->get();

        // 3. Closures
        $closures = TerrainSlotClosure::where('terrain_id', $terrain->id)
            ->where('closure_date', $dateStr)
            ->get();

        // 4. Occurrences with specific status for this date
        $occurrences = TerrainBookingOccurrence::where('stadium_id', $terrain->id)
            ->where('occurrence_date', $dateStr)
            ->get()
            ->keyBy('terrain_booking_id');

        // 5. Fixture matches
        $fixtures = Fixture::where('stadium_id', $terrain->id)
            ->whereDate('scheduled_at', $dateStr)
            ->whereNotIn('status', [FixtureStatus::Cancelled, FixtureStatus::Postponed])
            ->when($excludeFixtureId, fn ($q) => $q->where('id', '!=', $excludeFixtureId))
            ->with(['homeTeam', 'awayTeam', 'match:id,match_duration_minutes'])
            ->get();

        $slots = collect($rawSlots)->map(function ($slot) use (
            $singleBookings,
            $weeklySubscriptions,
            $closures,
            $occurrences,
            $fixtures,
            $forTournamentId
        ) {
            $start = $slot['start'];
            $end = $slot['end'];

            // A. Check single booking
            $booking = $singleBookings->first(function ($b) use ($start, $end) {
                return $b->start_time < $end && $b->end_time > $start;
            });

            // B. Check weekly subscription
            if (! $booking) {
                $sub = $weeklySubscriptions->first(function ($s) use ($start, $end) {
                    return $s->start_time < $end && $s->end_time > $start;
                });

                if ($sub) {
                    $occ = $occurrences->get($sub->id);
                    // Check if freed or cancelled for this specific date
                    if ($occ && in_array($occ->status, [TerrainBookingOccurrence::STATUS_FREED, TerrainBookingOccurrence::STATUS_CANCELLED], true)) {
                        $booking = null; // Freed for this date!
                    } elseif ($occ && $occ->status === TerrainBookingOccurrence::STATUS_RELEASED) {
                        // Released to tournament teams (Step 2)
                        if ($forTournamentId && (int) ($occ->metadata['tournament_id'] ?? 0) === (int) $forTournamentId) {
                            $booking = null; // Available to this tournament's managers
                        } else {
                            $booking = $sub; // Still blocked for outsiders
                        }
                    } else {
                        $booking = $sub;
                    }
                }
            }

            // C. Check closure
            $closure = null;
            if (! $booking) {
                $closure = $closures->first(function ($c) use ($start, $end) {
                    return $c->start_time < $end && $c->end_time > $start;
                });
            }

            // D. Check weather block occurrence
            $weatherBlock = null;
            if (! $booking && ! $closure) {
                $weatherBlock = $occurrences->first(function ($o) use ($start, $end) {
                    return $o->status === TerrainBookingOccurrence::STATUS_WEATHER_BLOCKED
                        && $o->start_time < $end && $o->end_time > $start;
                });
            }

            // E. Check active fixture
            $fixture = null;
            $fixtureDuration = 60;
            if (! $booking && ! $closure && ! $weatherBlock) {
                $fixture = $fixtures->first(function ($f) use ($start, $end, &$fixtureDuration) {
                    $fStart = Carbon::parse($f->scheduled_at);
                    $fixtureDuration = (int) ($f->match?->match_duration_minutes ?? 60);
                    $fEnd = $fStart->copy()->addMinutes($fixtureDuration);
                    return $fStart->format('H:i') < $end && $fEnd->format('H:i') > $start;
                });
            }

            // Determine status and reason
            if ($booking) {
                $isSub = ($booking->reservation_type === 'weekly_subscription');
                $teamName = $booking->team?->name ?? $booking->guest_name;
                $reason = $isSub
                    ? ($teamName ? "أبونمان أسبوعي: {$teamName}" : 'أبونمان أسبوعي')
                    : ($teamName ? "محجوز: {$teamName}" : 'محجوز');

                return [
                    'start' => $start,
                    'end' => $end,
                    'status' => 'booked',
                    'is_available' => false,
                    'unavailability_reason' => $reason,
                    'booking' => [
                        'id' => $booking->id,
                        'booking_type' => $booking->booking_type,
                        'reservation_type' => $booking->reservation_type,
                        'status' => $booking->status,
                        'price' => (float) $booking->price,
                        'start_time' => $booking->start_time,
                        'end_time' => $booking->end_time,
                        'manager' => $booking->manager?->only(['id', 'name']),
                        'team' => $booking->team?->only(['id', 'name']),
                        'guest_name' => $booking->guest_name,
                    ],
                    'closure' => null,
                ];
            }

            if ($closure) {
                return [
                    'start' => $start,
                    'end' => $end,
                    'status' => 'closed',
                    'is_available' => false,
                    'unavailability_reason' => $closure->reason ? "مغلق: {$closure->reason}" : 'مغلق',
                    'booking' => null,
                    'closure' => [
                        'id' => $closure->id,
                        'reason' => $closure->reason,
                    ],
                ];
            }

            if ($weatherBlock) {
                return [
                    'start' => $start,
                    'end' => $end,
                    'status' => 'closed',
                    'is_available' => false,
                    'unavailability_reason' => 'مغلق: ظروف جوية / أرضية الملعب',
                    'booking' => null,
                    'closure' => [
                        'id' => null,
                        'reason' => 'ظروف جوية / أرضية الملعب',
                    ],
                ];
            }

            if ($fixture) {
                $matchLabel = ($fixture->homeTeam?->name && $fixture->awayTeam?->name)
                    ? "مباراة بطولة: {$fixture->homeTeam->name} ضد {$fixture->awayTeam->name}"
                    : 'مباراة بطولة مبرمجة';

                return [
                    'start' => $start,
                    'end' => $end,
                    'status' => 'booked',
                    'is_available' => false,
                    'unavailability_reason' => $matchLabel,
                    'booking' => [
                        'id' => null,
                        'booking_type' => 'match',
                        'reservation_type' => 'single',
                        'status' => 'fixture_scheduled',
                        'price' => 0,
                        'start_time' => Carbon::parse($fixture->scheduled_at)->format('H:i'),
                        'end_time' => Carbon::parse($fixture->scheduled_at)->addMinutes($fixtureDuration)->format('H:i'),
                        'manager' => null,
                        'team' => $fixture->homeTeam?->only(['id', 'name']),
                        'guest_name' => ($fixture->homeTeam?->name && $fixture->awayTeam?->name) ? "{$fixture->homeTeam->name} vs {$fixture->awayTeam->name}" : 'مباراة بطولة',
                    ],
                    'fixture' => [
                        'id' => $fixture->id,
                        'home_team' => $fixture->homeTeam?->only(['id', 'name']),
                        'away_team' => $fixture->awayTeam?->only(['id', 'name']),
                        'scheduled_at' => $fixture->scheduled_at,
                    ],
                    'closure' => null,
                ];
            }

            return [
                'start' => $start,
                'end' => $end,
                'status' => 'available',
                'is_available' => true,
                'unavailability_reason' => null,
                'booking' => null,
                'closure' => null,
            ];
        })->toArray();

        return [
            'terrain' => $terrain->only(['id', 'name', 'type', 'player_format', 'price_per_team', 'is_open', 'closure_reason']),
            'schedule' => [
                'open_time' => $schedule->open_time,
                'close_time' => $schedule->close_time,
                'slot_duration' => $schedule->slot_duration_minutes ?: 60,
            ],
            'date' => $dateStr,
            'slots' => $slots,
        ];
    }

    /**
     * Compute comprehensive slot availability for a stadium for a full week.
     * Generates outside-working-hours blocks as closed ('خارج أوقات العمل') so the
     * calendar grid is consistent and never rendered blank.
     *
     * @return array<string, mixed>
     */
    public function getDetailedSlotsForWeek(Stadium $terrain, string $weekStart, int $weeks = 1): array
    {
        $startOfWeek = Carbon::parse($weekStart)->startOfWeek();
        $rangeEnd = $startOfWeek->copy()->addDays(7 * min(max($weeks, 1), 12) - 1);

        $schedules = TerrainSchedule::where('terrain_id', $terrain->id)
            ->where('is_active', true)
            ->get()
            ->keyBy('day_of_week');

        // Find earliest open and latest close across all active schedules to establish week timeline
        $minOpen = 24 * 60;
        $maxClose = 0;
        foreach ($schedules as $s) {
            $o = $this->timeToMinutes($s->open_time);
            $c = $this->timeToMinutes($s->close_time);
            if ($o < $minOpen) $minOpen = $o;
            if ($c > $maxClose) $maxClose = $c;
        }

        if ($minOpen >= $maxClose) {
            $minOpen = 9 * 60;
            $maxClose = 23 * 60;
        }

        $days = [];
        for ($d = $startOfWeek->copy(); $d->lte($rangeEnd); $d->addDay()) {
            $dateStr = $d->toDateString();
            $dow = $d->dayOfWeek;
            $sch = $schedules->get($dow);

            $dayResult = $this->getDetailedSlotsForDate($terrain, $dateStr);
            $slots = $dayResult['slots'] ?? [];

            $duration = $terrain->slot_duration_minutes ?: ($sch?->slot_duration_minutes ?: 60);

            // Fill non-working hours before open_time and after close_time as closed ('خارج أوقات العمل')
            $fullDaySlots = [];
            $schOpen = $sch ? $this->timeToMinutes($sch->open_time) : $maxClose;
            $schClose = $sch ? $this->timeToMinutes($sch->close_time) : $minOpen;

            if (! $sch) {
                // Entire day is closed / outside working hours
                $closedRaw = $this->generateSlots($this->minutesToTime($minOpen), $this->minutesToTime($maxClose), $duration);
                foreach ($closedRaw as $cr) {
                    $fullDaySlots[] = [
                        'start' => $cr['start'],
                        'end' => $cr['end'],
                        'status' => 'closed',
                        'is_available' => false,
                        'unavailability_reason' => 'مغلق (خارج أوقات العمل)',
                        'booking' => null,
                        'closure' => ['id' => null, 'reason' => 'خارج أوقات العمل'],
                    ];
                }
            } else {
                // Before open
                if ($schOpen > $minOpen) {
                    $beforeRaw = $this->generateSlots($this->minutesToTime($minOpen), $this->minutesToTime($schOpen), $duration);
                    foreach ($beforeRaw as $br) {
                        $fullDaySlots[] = [
                            'start' => $br['start'],
                            'end' => $br['end'],
                            'status' => 'closed',
                            'is_available' => false,
                            'unavailability_reason' => 'مغلق (خارج أوقات العمل)',
                            'booking' => null,
                            'closure' => ['id' => null, 'reason' => 'خارج أوقات العمل'],
                        ];
                    }
                }

                // Normal working slots
                foreach ($slots as $s) {
                    $fullDaySlots[] = $s;
                }

                // After close
                if ($schClose < $maxClose) {
                    $afterRaw = $this->generateSlots($this->minutesToTime($schClose), $this->minutesToTime($maxClose), $duration);
                    foreach ($afterRaw as $ar) {
                        $fullDaySlots[] = [
                            'start' => $ar['start'],
                            'end' => $ar['end'],
                            'status' => 'closed',
                            'is_available' => false,
                            'unavailability_reason' => 'مغلق (خارج أوقات العمل)',
                            'booking' => null,
                            'closure' => ['id' => null, 'reason' => 'خارج أوقات العمل'],
                        ];
                    }
                }
            }

            $days[] = [
                'date' => $dateStr,
                'day_name' => $d->translatedFormat('l'),
                'is_open' => $sch !== null,
                'slots' => $fullDaySlots,
            ];
        }

        return [
            'terrain' => $terrain->only(['id', 'name', 'type', 'player_format', 'price_per_team', 'is_open', 'closure_reason']),
            'week' => [
                'start' => $startOfWeek->toDateString(),
                'end' => $rangeEnd->toDateString(),
            ],
            'days' => $days,
        ];
    }

    public function generateSlots(string $startTime, string $endTime, int $durationMinutes): array
    {
        $slots = [];
        $current = Carbon::parse($startTime);
        $end = Carbon::parse($endTime);

        while ($current->lt($end)) {
            $slotEnd = $current->copy()->addMinutes($durationMinutes);
            if ($slotEnd->gt($end)) {
                break;
            }
            $slots[] = [
                'start' => $current->format('H:i'),
                'end' => $slotEnd->format('H:i'),
            ];
            $current = $slotEnd;
        }

        return $slots;
    }

    private function timeToMinutes(string $time): int
    {
        $parts = explode(':', $time);
        return ((int) $parts[0]) * 60 + ((int) ($parts[1] ?? 0));
    }

    private function minutesToTime(int $minutes): string
    {
        $h = intdiv($minutes, 60);
        $m = $minutes % 60;
        return sprintf('%02d:%02d', $h, $m);
    }
}
