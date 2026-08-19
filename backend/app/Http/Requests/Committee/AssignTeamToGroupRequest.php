<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class AssignTeamToGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'team_id' => ['required', 'integer'],
            'group_id' => ['nullable', 'integer'],
            'group_position' => ['nullable', 'integer', 'min:1'],
            'new_group' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'team_id.required' => 'الفريق مطلوب',
            'group_position.min' => 'ترتيب الفريق غير صالح',
        ];
    }
}
