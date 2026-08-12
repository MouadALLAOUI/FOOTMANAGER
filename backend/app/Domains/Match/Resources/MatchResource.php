<?php

namespace App\Domains\Match\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'match_request_id' => $this->match_request_id,
            'status' => $this->status->value,
            'is_live' => $this->status->isLive(),
            'is_finished' => $this->isFinished(),
            'period' => $this->current_period,
            'minute' => $this->current_minute,
            'added_time' => $this->added_time,
            'home_team' => [
                'id' => $this->homeTeam?->id,
                'name' => $this->homeTeam?->name,
                'logo_url' => $this->homeTeam?->logo_url,
            ],
            'away_team' => [
                'id' => $this->awayTeam?->id,
                'name' => $this->awayTeam?->name,
                'logo_url' => $this->awayTeam?->logo_url,
            ],
            'score' => [
                'home' => $this->home_score,
                'away' => $this->away_score,
            ],
            'winner_team_id' => $this->winner_team_id,
            'stadium' => $this->whenLoaded('stadium', fn () => $this->stadium
                ? [
                    'id' => $this->stadium->id,
                    'name' => $this->stadium->name,
                    'type' => $this->stadium->type,
                    'city' => $this->stadium->city,
                    'region' => $this->stadium->region,
                ]
                : null),
            'weather' => $this->weather,
            'attendance' => $this->attendance,
            'events' => EventResource::collection($this->whenLoaded('events')),
            'statistics' => StatisticsResource::collection($this->whenLoaded('statistics')),
            'lineups' => $this->whenLoaded('lineups'),
            'performances' => PerformanceResource::collection($this->whenLoaded('performances')),
            'media' => $this->whenLoaded('media'),
            'started_at' => $this->started_at?->toIso8601String(),
            'kicked_off_at' => $this->kicked_off_at?->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
        ];
    }
}
