<?php

namespace App\Domains\Competition\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompetitionFixtureResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'competition_id' => $this->competition_id,
            'competition_name' => $this->whenLoaded('competition', fn () => $this->competition?->name),
            'season_id' => $this->season_id,
            'round_id' => $this->round_id,
            'round_name' => $this->whenLoaded('round', fn () => $this->round?->name),
            'group_id' => $this->group_id,
            'match_id' => $this->match_id,
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
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'status' => $this->status->value,
            'score' => $this->whenLoaded('match', fn () => [
                'home' => $this->match?->home_score,
                'away' => $this->match?->away_score,
            ]),
        ];
    }
}
