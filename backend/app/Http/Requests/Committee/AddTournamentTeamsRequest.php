<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class AddTournamentTeamsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'team_ids' => ['required', 'array', 'min:1', 'max:64'],
            'team_ids.*' => ['integer', 'distinct', 'exists:teams,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'team_ids.required' => 'اختر فريقاً واحداً على الأقل',
            'team_ids.*.exists' => 'أحد الفرق المحددة غير موجود',
            'team_ids.*.distinct' => 'لا يمكن تكرار نفس الفريق',
        ];
    }
}
