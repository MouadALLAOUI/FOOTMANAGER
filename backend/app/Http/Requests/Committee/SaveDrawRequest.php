<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class SaveDrawRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'teams' => ['required', 'array', 'min:1'],
            'teams.*.team_id' => ['required', 'integer'],
            'teams.*.group_id' => ['nullable'],
            'teams.*.group_position' => ['nullable', 'integer', 'min:1'],
            'groups' => ['nullable', 'array'],
            'groups.*.key' => ['required', 'string', 'distinct', 'max:60'],
        ];
    }

    public function messages(): array
    {
        return [
            'teams.required' => 'قائمة الفرق مطلوبة',
            'teams.*.team_id.required' => 'الفريق مطلوب',
            'teams.*.group_position.min' => 'ترتيب الفريق غير صالح',
            'groups.*.key.distinct' => 'لا يمكن تكرار مفاتيح المجموعات الجديدة',
        ];
    }
}
