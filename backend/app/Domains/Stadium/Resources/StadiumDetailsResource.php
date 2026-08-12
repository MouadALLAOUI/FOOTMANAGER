<?php

namespace App\Domains\Stadium\Resources;

use App\Domains\Stadium\Services\StadiumAvailabilityService;
use Illuminate\Http\Request;

class StadiumDetailsResource extends StadiumResource
{
    public function toArray(Request $request): array
    {
        $availability = app(StadiumAvailabilityService::class);

        return array_merge(parent::toArray($request), [
            'description' => $this->description,
            'has_benches' => (bool) $this->has_benches,
            'supports_tournaments' => (bool) $this->supports_tournaments,
            'has_lighting' => (bool) $this->has_lighting,
            'has_vestiaires' => (bool) $this->has_vestiaires,
            'owner' => $this->whenLoaded('owner', fn () => [
                'id' => $this->owner->id,
                'name' => $this->owner->name,
            ]),
            'schedules' => $this->whenLoaded('schedules', fn () => $this->schedules
                ->filter(fn ($s) => $s->is_active)
                ->map(fn ($s) => [
                    'day_of_week' => $s->day_of_week,
                    'open_time' => $s->open_time,
                    'close_time' => $s->close_time,
                    'slot_duration_minutes' => $s->slot_duration_minutes,
                ])
                ->values()),
            'availability' => [
                'is_open' => $availability->isOpen($this->resource),
                'next_available_slot' => $availability->nextAvailableSlot($this->resource),
            ],
        ]);
    }
}
