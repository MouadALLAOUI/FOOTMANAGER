<?php

namespace App\Domains\Player\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlayerMatchRatingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'match_request_id' => $this->match_request_id,
            'match_date' => $this->match_date?->toDateString(),
            'result' => $this->result,
            'rating' => $this->rating !== null ? (float) $this->rating : null,
            'goals' => $this->goals,
            'assists' => $this->assists,
            'mvp' => (bool) $this->mvp,
            'minutes' => $this->minutes,
        ];
    }
}
