<?php

namespace App\Http\Requests\Player;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePlayerSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'language' => ['sometimes', 'in:ar,en'],
            'notification_preferences' => ['sometimes', 'array'],
            'notification_preferences.application_updates' => ['sometimes', 'boolean'],
            'notification_preferences.invitations' => ['sometimes', 'boolean'],
            'notification_preferences.upcoming_matches' => ['sometimes', 'boolean'],
            'notification_preferences.achievements' => ['sometimes', 'boolean'],
            'notification_preferences.reminders' => ['sometimes', 'boolean'],
            'visibility' => ['sometimes', 'in:public,private'],
            'contact_visibility' => ['sometimes', 'in:public,team,private'],
            'recruitment_available' => ['sometimes', 'boolean'],
            'availability_status' => ['sometimes', 'in:available,busy,vacation,injured,unavailable'],
            'preferred_playing_days' => ['sometimes', 'array'],
            'preferred_playing_days.*' => ['integer', 'between:0,6'],
            'preferred_playing_hours' => ['sometimes', 'array'],
            'preferred_playing_hours.*' => ['string', 'max:20'],
            'preferred_cities' => ['sometimes', 'array'],
            'preferred_cities.*' => ['string', 'max:100'],
        ];
    }
}
