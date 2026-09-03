<?php

namespace App\Http\Requests\Committee;

use App\Http\Requests\Committee\Concerns\ValidatesTournamentStructure;
use Illuminate\Foundation\Http\FormRequest;

class StoreTournamentRequest extends FormRequest
{
    use ValidatesTournamentStructure;

    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'edition' => 'nullable|string|max:60',
            'category' => 'nullable|string|max:60',
            'description' => 'nullable|string|max:2000',
            'rules' => 'nullable|string|max:10000',
            'location' => 'nullable|string|max:255',
            'stadium_id' => 'nullable|integer|exists:stadiums,id',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'registration_start_at' => 'nullable|date',
            'registration_end_at' => 'nullable|date',
            'registration_fee' => 'nullable|numeric|min:0|max:99999999',
            'tournament_format' => 'required|in:groups_knockout,groups_only,knockout_only,league,custom',
            'teams_count' => 'required|integer|min:2|max:64',
            'groups_count' => 'nullable|integer|min:1|max:16',
            'teams_per_group' => 'nullable|integer|min:2|max:16|required_if:tournament_format,groups_knockout,groups_only',
            'max_players_per_team' => 'nullable|integer|min:1|max:99',
            'group_mode' => 'nullable|in:free,fixed',
            'match_duration_minutes' => 'sometimes|integer|min:1|max:300',
            'half_duration_minutes' => 'nullable|integer|min:1|max:180',
            'first_half_extra_minutes' => 'nullable|integer|min:0|max:30',
            'second_half_extra_minutes' => 'nullable|integer|min:0|max:30',
            'matches_per_day' => 'nullable|integer|min:1|max:30',
            'knockout_teams' => 'nullable|integer|min:2|max:64',
            'qualify_per_group' => 'nullable|integer|min:1|max:16',
            'points_for_win' => 'required|integer|min:0|max:10',
            'points_for_draw' => 'required|integer|min:0|max:10',
            'points_for_loss' => 'required|integer|min:0|max:10',
            'foul_rules_enabled' => 'sometimes|boolean',
            'player_foul_threshold' => 'nullable|integer|min:2|max:99',
            'player_penalty_minutes' => 'nullable|integer|min:1|max:180',
            'player_foul_repeat' => 'sometimes|boolean',
            'team_foul_threshold' => 'nullable|integer|min:2|max:99',
            'team_foul_repeat' => 'sometimes|boolean',
            'foul_reset_scope' => 'sometimes|in:half,match',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم البطولة مطلوب',
            'start_date.required' => 'تاريخ انطلاق البطولة مطلوب',
            'end_date.after_or_equal' => 'تاريخ نهاية البطولة يجب أن يكون بعد تاريخ البداية أو مساوياً له',
            'tournament_format.in' => 'صيغة البطولة غير صالحة',
            'teams_count.min' => 'عدد الفرق يجب أن يكون 2 على الأقل',
            'groups_count.min' => 'عدد المجموعات يجب أن يكون 1 على الأقل',
            'teams_per_group.min' => 'عدد الفرق في المجموعة يجب أن يكون 2 على الأقل',
            'max_players_per_team.min' => 'الحد الأقصى للاعبين يجب أن يكون 1 على الأقل',
            'max_players_per_team.max' => 'الحد الأقصى للاعبين لا يجب أن يتجاوز 99',
        ];
    }
}
