<?php

namespace App\Services;

use App\Models\Stadium;
use App\Models\TerrainBooking;
use App\Models\TerrainSchedule;
use App\Models\TerrainSlotClosure;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class CalendarSlotService
{
    public function getSlotsForDate(Stadium $terrain, string $date): array
    {
        $dateObj = Carbon::parse($date);
        $dayOfWeek = $dateObj->dayOfWeek;
        $dateStr = $dateObj->toDateString();

        $schedule = TerrainSchedule::where('terrain_id', $terrain->id)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_active', true)
            ->first();

        if (!$schedule) {
            return [];
        }

        $rawSlots = $this->generateSlots(
            $schedule->open_time,
            $schedule->close_time,
            $schedule->slot_duration_minutes,
        );

        $activeBookings = $this->getActiveBookingsForDate($terrain->id, $dateStr, $dayOfWeek);

        $dayClosures = TerrainSlotClosure::where('terrain_id', $terrain->id)
            ->where('closure_date', $dateStr)
            ->get();

        return collect($rawSlots)->map(function ($slot) use ($activeBookings, $dayClosures) {
            $booking = $activeBookings->first(function ($b) use ($slot) {
                return $b->start_time <= $slot['start'] && $b->end_time > $slot['start']
                    || $b->start_time < $slot['end'] && $b->end_time >= $slot['end']
                    || $b->start_time >= $slot['start'] && $b->end_time <= $slot['end'];
            });

            $status = $booking ? $booking->status : 'available';
            $closure = null;

            if (!$booking) {
                $closure = $dayClosures->first(function ($c) use ($slot) {
                    return $c->start_time <= $slot['start'] && $c->end_time > $slot['start'];
                });
                if ($closure) {
                    $status = 'closed';
                }
            }

            return [
                'start' => $slot['start'],
                'end' => $slot['end'],
                'is_available' => !$booking && !$closure,
                'status' => $status,
                'booking' => $booking ? [
                    'id' => $booking->id,
                    'booking_type' => $booking->booking_type,
                    'flow_type' => $booking->flow_type ?? 'direct',
                    'reservation_type' => $booking->reservation_type,
                    'status' => $booking->status,
                    'price' => $booking->price,
                    'start_time' => $booking->start_time,
                    'end_time' => $booking->end_time,
                    'manager' => $booking->manager?->only(['id', 'name', 'phone', 'is_whatsapp']),
                    'team' => $booking->team?->only(['id', 'name']),
                ] : null,
                'closure' => $closure ? [
                    'id' => $closure->id,
                    'reason' => $closure->reason,
                ] : null,
            ];
        })->toArray();
    }

    public function getSlotsForWeek(Stadium $terrain, string $weekStart): array
    {
        $start = Carbon::parse($weekStart)->startOfWeek();
        $end = $start->copy()->endOfWeek();

        $schedules = TerrainSchedule::where('terrain_id', $terrain->id)
            ->where('is_active', true)
            ->get()
            ->keyBy('day_of_week');

        $singleBookings = TerrainBooking::where('terrain_id', $terrain->id)
            ->where('reservation_type', 'single')
            ->whereBetween('booking_date', [$start->toDateString(), $end->toDateString()])
            ->whereIn('status', ['pending', 'approved'])
            ->with(['manager', 'team'])
            ->get();

        $weekDays = [];
        for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
            $weekDays[] = $d->dayOfWeek;
        }

        $weeklySubscriptions = TerrainBooking::where('terrain_id', $terrain->id)
            ->where('reservation_type', 'weekly_subscription')
            ->whereIn('day_of_week', array_unique($weekDays))
            ->whereIn('status', ['pending', 'approved'])
            ->with(['manager', 'team'])
            ->get()
            ->filter(function ($sub) use ($start, $end) {
                if ($sub->start_date && $sub->start_date->gt($end)) return false;
                if ($sub->end_date && $sub->end_date->lt($start)) return false;
                return true;
            });

        $closures = TerrainSlotClosure::where('terrain_id', $terrain->id)
            ->whereBetween('closure_date', [$start->toDateString(), $end->toDateString()])
            ->get();

        $days = [];
        for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
            $daySingleBookings = $singleBookings->filter(fn($b) => $b->booking_date?->isSameDay($d));
            $schedule = $schedules->get($d->dayOfWeek);

            $slots = [];
            if ($schedule) {
                $rawSlots = $this->generateSlots(
                    $schedule->open_time,
                    $schedule->close_time,
                    $schedule->slot_duration_minutes,
                );

                foreach ($rawSlots as $slot) {
                    $booking = $daySingleBookings->first(function ($b) use ($slot) {
                        return $b->start_time <= $slot['start'] && $b->end_time > $slot['start']
                            || $b->start_time < $slot['end'] && $b->end_time >= $slot['end']
                            || $b->start_time >= $slot['start'] && $b->end_time <= $slot['end'];
                    });

                    if (!$booking) {
                        $subscription = $weeklySubscriptions->first(function ($sub) use ($d, $slot) {
                            return $sub->day_of_week === $d->dayOfWeek
                                && $sub->coversDate($d)
                                && ($sub->start_time <= $slot['start'] && $sub->end_time > $slot['start']
                                    || $sub->start_time < $slot['end'] && $sub->end_time >= $slot['end']
                                    || $sub->start_time >= $slot['start'] && $sub->end_time <= $slot['end']);
                        });
                        if ($subscription) {
                            $booking = $subscription;
                        }
                    }

                    $slotStatus = $booking ? $booking->status : 'available';
                    $slotClosure = null;

                    if (!$booking) {
                        $slotClosure = $closures->first(function ($c) use ($d, $slot) {
                            return $c->closure_date->isSameDay($d)
                                && $c->start_time <= $slot['start'] && $c->end_time > $slot['start'];
                        });
                        if ($slotClosure) {
                            $slotStatus = 'closed';
                        }
                    }

                    $slots[] = [
                        'start' => $slot['start'],
                        'end' => $slot['end'],
                        'is_available' => !$booking && !$slotClosure,
                        'status' => $slotStatus,
                        'booking' => $booking ? [
                            'id' => $booking->id,
                            'booking_type' => $booking->booking_type,
                            'flow_type' => $booking->flow_type ?? 'direct',
                            'reservation_type' => $booking->reservation_type ?? 'single',
                            'status' => $booking->status,
                            'price' => $booking->price,
                            'start_time' => $booking->start_time,
                            'end_time' => $booking->end_time,
                            'manager' => $booking->manager?->only(['id', 'name', 'phone', 'is_whatsapp']),
                            'team' => $booking->team?->only(['id', 'name']),
                        ] : null,
                        'closure' => $slotClosure ? [
                            'id' => $slotClosure->id,
                            'reason' => $slotClosure->reason,
                        ] : null,
                    ];
                }
            }

            $days[] = [
                'date' => $d->toDateString(),
                'day_name' => $d->translatedFormat('l'),
                'is_open' => $schedule !== null,
                'slots' => $slots,
            ];
        }

        return $days;
    }

    private function getActiveBookingsForDate(int $terrainId, string $dateStr, int $dayOfWeek): Collection
    {
        $dateObj = Carbon::parse($dateStr);

        return TerrainBooking::where('terrain_id', $terrainId)
            ->whereIn('status', ['pending', 'approved'])
            ->where(function ($q) use ($dateStr, $dayOfWeek) {
                $q->where(function ($sq) use ($dateStr) {
                    $sq->where('reservation_type', 'single')
                        ->where('booking_date', $dateStr);
                })
                ->orWhere(function ($sq) use ($dayOfWeek, $dateStr) {
                    $sq->where('reservation_type', 'weekly_subscription')
                        ->where('day_of_week', $dayOfWeek)
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
            ->with(['manager', 'team'])
            ->get();
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

    public function getSlotOverlaps(Collection $bookings, string $start, string $end): ?TerrainBooking
    {
        return $bookings->first(function ($b) use ($start, $end) {
            return $b->start_time <= $start && $b->end_time > $start
                || $b->start_time < $end && $b->end_time >= $end
                || $b->start_time >= $start && $b->end_time <= $end;
        });
    }
}
