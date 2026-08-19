<?php

namespace App\Http\Requests\Committee;

use App\Http\Requests\Committee\Concerns\ValidatesTournamentStructure;
use Illuminate\Foundation\Http\FormRequest;

class UpdateTournamentRequest extends FormRequest
{
    use ValidatesTournamentStructure;

    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'edition' => 'nullable|string|max:60',
            'category' => 'nullable|string|max:60',
            'description' => 'nullable|string|max:2000',
            'rules' => 'nullable|string|max:10000',
            'location' => 'nullable|string|max:255',
            'stadium_id' => 'nullable|integer|exists:stadiums,id',
            'start_date' => 'sometimes|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'registration_start_at' => 'nullable|date',
            'registration_end_at' => 'nullable|date',
            'registration_fee' => 'nullable|numeric|min:0|max:99999999',
            'tournament_format' => 'sometimes|in:groups_knockout,groups_only,knockout_only,league,custom',
            'teams_count' => 'sometimes|integer|min:2|max:64',
            'groups_count' => 'sometimes|integer|min:1|max:16',
            'teams_per_group' => 'sometimes|integer|min:2|max:16',
            'group_mode' => 'sometimes|in:free,fixed',
            'match_duration_minutes' => 'sometimes|integer|min:1|max:300',
            'matches_per_day' => 'nullable|integer|min:1|max:30',
            'knockout_teams' => 'nullable|integer|min:2|max:64',
            'qualify_per_group' => 'sometimes|integer|min:1|max:16',
            'points_for_win' => 'sometimes|integer|min:0|max:10',
            'points_for_draw' => 'sometimes|integer|min:0|max:10',
            'points_for_loss' => 'sometimes|integer|min:0|max:10',
            'card_accumulation' => 'sometimes|in:disabled,group,tournament',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم البطولة مطلوب',
            'start_date.required' => 'تاريخ انطلاق البطولة مطلوب',
            'end_date.after_or_equal' => 'تاريخ نهاية البطولة يجب أن يكون بعد تاريخ البداية أو مساوياً له',
            'tournament_format.in' => 'صيغة البطولة غير صالحة',
        ];
    }
}
