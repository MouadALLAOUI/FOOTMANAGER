<?php

namespace App\Domains\Team\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'player' => $this->whenLoaded('player', fn () => [
                'id' => $this->player->id,
                'name' => $this->player->name,
                'number' => $this->player->number,
                'status' => $this->player->status,
            ]),
            'match' => $this->whenLoaded('matchRequest', fn () => $this->matchRequest ? [
                'id' => $this->matchRequest->id,
                'match_datetime' => $this->matchRequest->match_datetime,
                'status' => $this->matchRequest->status,
            ] : null),
            'session_date' => $this->session_date?->toDateString(),
            'status' => $this->status,
            'notes' => $this->notes,
            'recorded_by' => $this->whenLoaded('recorder', fn () => $this->recorder ? [
                'id' => $this->recorder->id,
                'name' => $this->recorder->name,
            ] : null),
            'created_at' => $this->created_at,
        ];
    }
}
