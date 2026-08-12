<?php

namespace App\Domains\Match\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StatisticsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'team_id' => $this->team_id,
            'team_name' => $this->whenLoaded('team', fn () => $this->team?->name),
            'possession' => $this->possession,
            'shots' => $this->shots,
            'shots_on_target' => $this->shots_on_target,
            'corners' => $this->corners,
            'fouls' => $this->fouls,
            'yellow_cards' => $this->yellow_cards,
            'red_cards' => $this->red_cards,
            'offsides' => $this->offsides,
            'saves' => $this->saves,
            'passes' => $this->passes,
            'pass_accuracy' => $this->pass_accuracy,
            'expected_goals' => $this->expected_goals,
        ];
    }
}
