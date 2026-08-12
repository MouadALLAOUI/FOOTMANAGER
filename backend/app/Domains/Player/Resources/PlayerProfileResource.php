<?php

namespace App\Domains\Player\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlayerProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $this->resource['user'] ?? null;
        $profile = $this->resource['profile'] ?? $this->resource;

        $contactVisible = $this->contactVisible($user, $request);

        return [
            'id' => $profile->id,
            'user' => [
                'id' => $user?->id,
                'name' => $user?->name,
                'phone' => $contactVisible ? $user?->phone : null,
                'is_whatsapp' => $contactVisible ? $user?->is_whatsapp : null,
            ],
            'position' => $profile->position,
            'skill_level' => $profile->skill_level,
            'birth_date' => $profile->birth_date?->toDateString(),
            'birth_year' => $profile->birth_year,
            'age' => $profile->age,
            'nationality' => $profile->nationality,
            'height_cm' => $profile->height_cm,
            'weight_kg' => $profile->weight_kg,
            'preferred_foot' => $profile->preferred_foot ?? $profile->strong_foot,
            'secondary_positions' => $profile->secondary_positions ?? [],
            'preferred_formats' => $profile->preferred_formats ?? [],
            'city' => $profile->city,
            'preferred_cities' => $profile->preferred_cities ?? [],
            'description' => $profile->description,
            'photo_url' => $profile->photo_url,
            'photo_thumbnail_url' => $profile->photo_thumbnail_url,
            'cover_photo_url' => $profile->cover_photo_url,
            'cover_photo_thumbnail_url' => $profile->cover_photo_thumbnail_url,
            'availability_status' => $profile->availability_status,
            'is_available' => (bool) $profile->is_available,
            'visibility' => $profile->visibility,
            'contact_visibility' => $profile->contact_visibility,
            'recruitment_available' => (bool) $profile->recruitment_available,
            'language' => $profile->language,
            'points' => $profile->points,
            'matches_played' => $profile->matches_played,
            'wins' => $profile->wins,
            'draws' => $profile->draws,
            'losses' => $profile->losses,
            'rating' => (float) $profile->rating,
            'overall_rating' => (float) $profile->overall_rating,
            'current_team' => $this->when($profile->relationLoaded('user'), $this->currentTeam($user)),
        ];
    }

    private function contactVisible($user, Request $request): bool
    {
        if (! $user) {
            return false;
        }

        if ((int) $user->id === (int) $request->user()?->id) {
            return true;
        }

        $visibility = $this->resource['profile']->contact_visibility ?? 'private';

        if ($visibility === 'public') {
            return true;
        }

        if ($visibility === 'team') {
            $viewer = $request->user();
            if (! $viewer) {
                return false;
            }

            $ownerTeam = $user->rosterPlayer?->team_id;
            $viewerTeam = $viewer->rosterPlayer?->team_id;

            return $ownerTeam && $viewerTeam && (int) $ownerTeam === (int) $viewerTeam;
        }

        return false;
    }

    private function currentTeam($user): ?array
    {
        $team = $user?->rosterPlayer?->team;

        if (! $team) {
            return null;
        }

        return [
            'id' => $team->id,
            'name' => $team->name,
            'logo_url' => $team->logo_url,
            'level' => $team->level,
        ];
    }
}
