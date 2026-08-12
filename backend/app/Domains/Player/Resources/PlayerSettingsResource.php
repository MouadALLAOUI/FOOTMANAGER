<?php

namespace App\Domains\Player\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlayerSettingsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $profile = $this->resource;

        return [
            'language' => $profile->language,
            'notification_preferences' => $profile->notification_preferences ?? config('player.notification_preferences'),
            'visibility' => $profile->visibility,
            'contact_visibility' => $profile->contact_visibility,
            'recruitment_available' => (bool) $profile->recruitment_available,
            'preferred_playing_days' => $profile->preferred_playing_days ?? [],
            'preferred_playing_hours' => $profile->preferred_playing_hours ?? [],
            'preferred_cities' => $profile->preferred_cities ?? [],
            'availability_status' => $profile->availability_status,
        ];
    }
}
