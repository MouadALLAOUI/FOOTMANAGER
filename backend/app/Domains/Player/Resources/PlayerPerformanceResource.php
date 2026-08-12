<?php

namespace App\Domains\Player\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlayerPerformanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $match = $this->matchRequest;

        return [
            'id' => $this->id,
            'match_date' => $this->match_date?->toDateString(),
            'result' => $this->result,
            'is_tournament' => (bool) $this->is_tournament,
            'started' => (bool) $this->started,
            'played' => (bool) $this->played,
            'minutes' => $this->minutes,
            'goals' => $this->goals,
            'assists' => $this->assists,
            'own_goals' => $this->own_goals,
            'yellow_cards' => $this->yellow_cards,
            'red_cards' => $this->red_cards,
            'rating' => $this->rating !== null ? (float) $this->rating : null,
            'mvp' => (bool) $this->mvp,
            'clean_sheet' => (bool) $this->clean_sheet,
            'match' => $match ? [
                'id' => $match->id,
                'match_datetime' => $match->match_datetime?->toIso8601String(),
                'host_score' => $match->host_score,
                'opponent_score' => $match->opponent_score,
            ] : null,
        ];
    }
}
