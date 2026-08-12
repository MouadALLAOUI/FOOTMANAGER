<?php

namespace App\Domains\Social\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SearchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $map = function ($items, string $type) {
            return $items->map(fn ($item) => $this->summarize($item, $type))->values();
        };

        return [
            'teams' => $map($this->resource['teams'] ?? collect(), 'team'),
            'players' => $map($this->resource['players'] ?? collect(), 'player'),
            'stadiums' => $map($this->resource['stadiums'] ?? collect(), 'stadium'),
            'live_matches' => $map($this->resource['live_matches'] ?? collect(), 'match'),
            'activities' => $map($this->resource['activities'] ?? collect(), 'activity'),
            'reviews' => $map($this->resource['reviews'] ?? collect(), 'comment'),
        ];
    }

    protected function summarize($item, string $type): array
    {
        return match ($type) {
            'team' => [
                'type' => 'team',
                'id' => $item->id,
                'name' => $item->name,
                'city' => $item->city,
                'category' => $item->category,
                'image_url' => $item->logo_url,
                'followers_count' => $item->followers_count,
            ],
            'player' => [
                'type' => 'player',
                'id' => $item->id,
                'name' => $item->name,
                'position' => $item->position,
                'team_id' => $item->team_id,
                'team_name' => $item->team?->name,
                'followers_count' => $item->followers_count,
            ],
            'stadium' => [
                'type' => 'stadium',
                'id' => $item->id,
                'name' => $item->name,
                'city' => $item->city,
                'type' => $item->type,
                'rating' => $item->rating,
                'reviews_count' => $item->reviews_count,
                'image_url' => $item->cover_image_url,
                'followers_count' => $item->followers_count,
            ],
            'match' => [
                'type' => 'match',
                'id' => $item->id,
                'home_team_id' => $item->home_team_id,
                'away_team_id' => $item->away_team_id,
                'home_team' => $item->homeTeam?->name,
                'away_team' => $item->awayTeam?->name,
                'home_score' => $item->home_score,
                'away_score' => $item->away_score,
            ],
            'activity' => [
                'type' => 'activity',
                'id' => $item->id,
                'activity_type' => $item->type,
                'created_at' => $item->created_at?->toIso8601String(),
            ],
            'comment' => [
                'type' => 'comment',
                'id' => $item->id,
                'body' => $item->body,
                'created_at' => $item->created_at?->toIso8601String(),
            ],
            default => ['type' => $type, 'id' => $item->id],
        };
    }
}
