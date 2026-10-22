<?php

namespace App\Domains\Booking\Services;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Stadium\Models\Stadium;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class CalendarSlotService
{
    public function __construct(
        private readonly SlotAvailabilityService $availabilityService,
    ) {}

    public function getSlotsForDate(Stadium $terrain, string $date): array
    {
        $detailed = $this->availabilityService->getDetailedSlotsForDate($terrain, $date);
        return $detailed['slots'] ?? [];
    }

    public function getSlotsForWeek(Stadium $terrain, string $weekStart): array
    {
        $detailed = $this->availabilityService->getDetailedSlotsForWeek($terrain, $weekStart, 1);
        return $detailed['days'] ?? [];
    }

    public function generateSlots(string $startTime, string $endTime, int $durationMinutes): array
    {
        return $this->availabilityService->generateSlots($startTime, $endTime, $durationMinutes);
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
