<?php

namespace App\Domains\Stadium\Services;

use App\Domains\Stadium\Models\Stadium;
use Illuminate\Support\Facades\Cache;

class StadiumAvailabilityService
{
    public function __construct(private CalendarSlotService $calendarSlotService) {}

    public function isOpen(Stadium $stadium): bool
    {
        return (bool) $stadium->is_available && (bool) $stadium->is_open;
    }

    public function nextAvailableSlot(Stadium $stadium): ?array
    {
        return Cache::remember('stadium.next_slot.'.$stadium->id, now()->addMinutes(15), function () use ($stadium) {
            if (! $this->isOpen($stadium)) {
                return null;
            }

            $now = now();
            $todayTime = $now->format('H:i');

            for ($i = 0; $i < 7; $i++) {
                $date = $now->copy()->addDays($i)->toDateString();

                foreach ($this->calendarSlotService->getSlotsForDate($stadium, $date) as $slot) {
                    if (! $slot['is_available']) {
                        continue;
                    }

                    if ($i === 0 && $slot['start'] <= $todayTime) {
                        continue;
                    }

                    return [
                        'date' => $date,
                        'start_time' => $slot['start'],
                        'end_time' => $slot['end'],
                    ];
                }
            }

            return null;
        });
    }
}
