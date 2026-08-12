<?php

namespace App\Domains\Team\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'logo_url' => $this->logo_url,
            'logo_thumbnail_url' => $this->logo_thumbnail_url,
            'cover_image_url' => $this->cover_image_url,
            'cover_thumbnail_url' => $this->cover_thumbnail_url,
            'category' => $this->category,
            'level' => $this->level,
            'association_name' => $this->association_name,
            'city' => $this->city,
            'region' => $this->region,
            'founded_year' => $this->founded_year,
            'max_squad_size' => $this->max_squad_size,
            'visibility' => $this->visibility,
            'preferred_formats' => $this->preferred_formats ?? [],
            'social_links' => $this->social_links ?? [],
            'description' => $this->description,
            'primary_color' => $this->primary_color,
            'secondary_color' => $this->secondary_color,
            'member_count' => $this->member_count,
            'points' => $this->points,
            'matches_played' => $this->matches_played,
            'wins' => $this->wins,
            'draws' => $this->draws,
            'losses' => $this->losses,
            'goals_for' => $this->goals_for,
            'goals_against' => $this->goals_against,
            'goal_difference' => $this->goal_difference,
            'home_stadium' => $this->whenLoaded('primaryStadium', fn () => $this->primaryStadium ? [
                'id' => $this->primaryStadium->id,
                'name' => $this->primaryStadium->name,
                'city' => $this->primaryStadium->city,
            ] : null),
            'captain' => $this->whenLoaded('captain', fn () => $this->captain ? [
                'id' => $this->captain->id,
                'name' => $this->captain->name,
                'number' => $this->captain->number,
                'role' => 'captain',
            ] : null),
            'vice_captain' => $this->whenLoaded('viceCaptain', fn () => $this->viceCaptain ? [
                'id' => $this->viceCaptain->id,
                'name' => $this->viceCaptain->name,
                'number' => $this->viceCaptain->number,
                'role' => 'vice_captain',
            ] : null),
            'manager' => $this->whenLoaded('manager', fn () => [
                'id' => $this->manager->id,
                'name' => $this->manager->name,
            ]),
        ];
    }
}
