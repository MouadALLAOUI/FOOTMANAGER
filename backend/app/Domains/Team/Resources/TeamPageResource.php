<?php

namespace App\Domains\Team\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamPageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $team = $this->resource['team'];

        return [
            'team' => [
                'id' => $team->id,
                'name' => $team->name,
                'logo_url' => $team->logo_url,
                'cover_image_url' => $team->cover_image_url,
                'category' => $team->category,
                'level' => $team->level,
                'city' => $team->city,
                'region' => $team->region,
                'founded_year' => $team->founded_year,
                'description' => $team->description,
                'primary_color' => $team->primary_color,
                'secondary_color' => $team->secondary_color,
                'manager' => $team->manager?->name,
                'primary_stadium' => $team->primaryStadium ? [
                    'id' => $team->primaryStadium->id,
                    'name' => $team->primaryStadium->name,
                    'city' => $team->primaryStadium->city,
                ] : null,
                'captain' => $team->captain ? [
                    'id' => $team->captain->id,
                    'name' => $team->captain->name,
                    'number' => $team->captain->number,
                    'position' => $team->captain->position,
                ] : null,
            ],
            'stats' => $this->resource['stats'],
            'squad' => $this->resource['squad'],
            'upcoming_matches' => $this->resource['upcoming_matches'],
            'recent_matches' => $this->resource['recent_matches'],
            'announcements' => $this->resource['announcements'],
            'gallery' => $this->resource['gallery'],
            'is_following' => $this->resource['is_following'],
            'is_favorite' => $this->resource['is_favorite'],
        ];
    }
}
