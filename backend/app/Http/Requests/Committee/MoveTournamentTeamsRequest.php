<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MoveTournamentTeamsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        $tournamentId = $this->route('tournament')->id;

        return [
            'team_ids' => ['required', 'array', 'min:1', 'max:64'],
            'team_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('tournament_teams', 'team_id')->where(function ($query) use ($tournamentId) {
                    $query->where('tournament_id', $tournamentId)
                        ->where('status', 'registered');
                }),
            ],
            'group_id' => ['required', 'integer'],
        ];
    }

    public function messages(): array
    {
        return [
            'team_ids.required' => 'اختر فريقاً واحداً على الأقل',
            'team_ids.*.exists' => 'أحد الفرق المحددة غير مسجل في هذه البطولة',
            'team_ids.*.distinct' => 'لا يمكن تكرار نفس الفريق',
            'group_id.required' => 'اختر مجموعة',
        ];
    }
}
