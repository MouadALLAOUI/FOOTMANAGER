<?php

namespace App\Http\Requests\Committee;

use App\Domains\Match\Enums\MatchEventType;
use Illuminate\Foundation\Http\FormRequest;

class StoreMatchEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        $types = implode(',', array_map(fn (MatchEventType $type) => $type->value, MatchEventType::cases()));

        return [
            'type' => "required|in:{$types}",
            'team_id' => 'nullable|integer|exists:teams,id',
            'player_id' => 'nullable|integer|exists:players,id',
            'assist_player_id' => 'nullable|integer|exists:players,id',
            'minute' => 'nullable|integer|min:0|max:180',
            'added_time' => 'nullable|integer|min:0|max:30',
            'half' => 'nullable|in:first,second',
            'period' => 'nullable|string|max:20',
            'description' => 'nullable|string|max:500',
            'metadata' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'type.required' => 'نوع الحدث مطلوب',
            'type.in' => 'نوع الحدث غير صالح',
        ];
    }
}
