<?php

namespace App\Http\Requests\Committee;

use App\Domains\Match\Enums\MatchEventType;
use App\Domains\Match\Enums\MatchStatus;
use Illuminate\Foundation\Http\FormRequest;

class UpdateFixtureResultRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        $eventTypes = implode(',', array_map(fn (MatchEventType $type) => $type->value, MatchEventType::cases()));
        $statuses = implode(',', array_map(fn (MatchStatus $status) => $status->value, MatchStatus::cases()));

        return [
            'home_score' => 'nullable|integer|min:0|max:99',
            'away_score' => 'nullable|integer|min:0|max:99',
            'home_penalties' => 'nullable|integer|min:0|max:99',
            'away_penalties' => 'nullable|integer|min:0|max:99',
            'extra_time' => 'sometimes|boolean',
            'notes' => 'nullable|string|max:2000',
            'status' => "nullable|in:{$statuses}",
            'current_period' => 'nullable|string|max:20',
            'current_minute' => 'nullable|integer|min:0|max:180',
            'force' => 'sometimes|boolean',
            'referees' => 'nullable|array|max:4',
            'referees.*.role' => 'required|in:main,assistant1,assistant2,fourth',
            'referees.*.referee_id' => 'required|integer|exists:referees,id',
            'events' => 'nullable|array|max:80',
            'events.*.type' => "required|in:{$eventTypes}",
            'events.*.team_id' => 'nullable|integer|exists:teams,id',
            'events.*.player_id' => 'nullable|integer|exists:players,id',
            'events.*.assist_player_id' => 'nullable|integer|exists:players,id',
            'events.*.minute' => 'nullable|integer|min:0|max:180',
            'events.*.added_time' => 'nullable|integer|min:0|max:30',
            'events.*.period' => 'nullable|string|max:20',
            'events.*.description' => 'nullable|string|max:500',
            'events.*.metadata' => 'nullable|array',
            'statistics' => 'nullable|array|max:2',
            'statistics.*.team_id' => 'required|integer|exists:teams,id',
            'statistics.*.possession' => 'nullable|integer|min:0|max:100',
            'statistics.*.shots' => 'nullable|integer|min:0|max:99',
            'statistics.*.shots_on_target' => 'nullable|integer|min:0|max:99',
            'statistics.*.corners' => 'nullable|integer|min:0|max:99',
            'statistics.*.fouls' => 'nullable|integer|min:0|max:99',
            'statistics.*.offsides' => 'nullable|integer|min:0|max:99',
            'statistics.*.saves' => 'nullable|integer|min:0|max:99',
            'statistics.*.passes' => 'nullable|integer|min:0|max:999',
            'statistics.*.pass_accuracy' => 'nullable|numeric|min:0|max:100',
            'statistics.*.expected_goals' => 'nullable|numeric|min:0|max:20',
            'player_of_the_match' => 'nullable|integer|exists:players,id',
        ];
    }

    public function messages(): array
    {
        return [
            'events.*.type.required' => 'نوع الحدث مطلوب',
            'events.*.type.in' => 'نوع الحدث غير صالح',
            'status.in' => 'حالة المباراة غير صالحة',
        ];
    }
}
