<?php

namespace App\Domains\Match\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class TimelineResource extends ResourceCollection
{
    public $collects = EventResource::class;

    public function toArray(Request $request): array
    {
        return [
            'total_events' => $this->collection->count(),
            'goals' => $this->collection->filter(fn ($event) => in_array($event->type->value, ['goal', 'penalty_goal'], true))->count(),
            'events' => $this->collection,
        ];
    }
}
