<?php

namespace App\Domains\Player\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlayerStatisticsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'matches_played' => $this->matches_played,
            'wins' => $this->wins,
            'draws' => $this->draws,
            'losses' => $this->losses,
            'win_rate' => $this->matches_played > 0 ? round($this->wins / $this->matches_played * 100, 1) : 0,
            'goals' => $this->goals,
            'assists' => $this->assists,
            'own_goals' => $this->own_goals,
            'goals_per_match' => $this->matches_played > 0 ? round($this->goals / $this->matches_played, 2) : 0,
            'assists_per_match' => $this->matches_played > 0 ? round($this->assists / $this->matches_played, 2) : 0,
            'yellow_cards' => $this->yellow_cards,
            'red_cards' => $this->red_cards,
            'clean_sheets' => $this->clean_sheets,
            'minutes_played' => $this->minutes_played,
            'avg_rating' => (float) $this->avg_rating,
            'best_match_rating' => $this->best_match_rating !== null ? (float) $this->best_match_rating : null,
            'mvp_count' => $this->mvp_count,
            'current_streak' => [
                'type' => $this->current_streak_type,
                'count' => $this->current_streak_count,
            ],
            'longest_winning_streak' => $this->longest_winning_streak,
            'last_synced_at' => $this->last_synced_at?->toIso8601String(),
        ];
    }
}
