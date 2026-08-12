<?php

namespace App\Domains\Team\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamStatisticsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'matches_played' => $this->resource['matches_played'],
            'wins' => $this->resource['wins'],
            'draws' => $this->resource['draws'],
            'losses' => $this->resource['losses'],
            'goals_for' => $this->resource['goals_for'],
            'goals_against' => $this->resource['goals_against'],
            'goal_difference' => $this->resource['goal_difference'],
            'points' => $this->resource['points'],
            'win_rate' => $this->resource['win_rate'],
            'average_goals' => $this->resource['average_goals'],
            'average_goals_conceded' => $this->resource['average_goals_conceded'],
            'current_streak' => $this->resource['current_streak'],
            'longest_winning_streak' => $this->resource['longest_winning_streak'],
            'biggest_win' => $this->resource['biggest_win'],
            'biggest_loss' => $this->resource['biggest_loss'],
            'clean_sheets' => $this->resource['clean_sheets'],
            'average_attendance' => $this->resource['average_attendance'],
            'most_active_player' => $this->resource['most_active_player'],
            'top_scorer' => $this->resource['top_scorer'],
            'top_assist_provider' => $this->resource['top_assist_provider'],
            'most_valuable_player' => $this->resource['most_valuable_player'],
        ];
    }
}
