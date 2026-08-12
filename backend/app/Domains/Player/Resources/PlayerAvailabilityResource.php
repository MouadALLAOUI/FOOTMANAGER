<?php

namespace App\Domains\Player\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlayerAvailabilityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        if ($this->resource['type'] ?? null === 'schedule') {
            return [
                'status' => $this->resource['status'],
                'weekly' => collect($this->resource['weekly'])->mapWithKeys(function ($day) {
                    return [$day['day'] => PlayerAvailabilityResource::collection($day['slots'])];
                })->all(),
            ];
        }

        return [
            'id' => $this->id,
            'day_of_week' => $this->day_of_week,
            'day_label' => $this->day_label,
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'active' => (bool) $this->active,
        ];
    }
}
