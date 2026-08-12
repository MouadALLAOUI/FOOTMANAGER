<?php

namespace App\Domains\Player\Services;

use App\Domains\Player\Models\PlayerAvailabilitySlot;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class PlayerAvailabilityService
{
    public function slots(int $userId): Collection
    {
        return PlayerAvailabilitySlot::query()
            ->where('user_id', $userId)
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();
    }

    public function store(User $user, array $data): PlayerAvailabilitySlot
    {
        $slot = $user->availabilitySlots()->create([
            'day_of_week' => $data['day_of_week'],
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time'],
            'active' => $data['active'] ?? true,
        ]);

        return $slot;
    }

    public function update(User $user, PlayerAvailabilitySlot $slot, array $data): PlayerAvailabilitySlot
    {
        $slot->fill(array_intersect_key($data, array_flip(['day_of_week', 'start_time', 'end_time', 'active'])));
        $slot->save();

        return $slot;
    }

    public function destroy(User $user, PlayerAvailabilitySlot $slot): void
    {
        $slot->delete();
    }

    public function weeklySchedule(int $userId): array
    {
        $slots = $this->slots($userId);

        $schedule = [];
        foreach (PlayerAvailabilitySlot::DAYS as $day => $label) {
            $schedule[$day] = [
                'day' => $day,
                'label' => $label,
                'slots' => $slots->where('day_of_week', $day)->values(),
            ];
        }

        return $schedule;
    }
}
