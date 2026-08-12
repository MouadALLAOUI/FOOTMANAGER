<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTournamentStadiumsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'stadium_ids' => ['required', 'array', 'min:1', 'max:32'],
            'stadium_ids.*' => ['integer', 'distinct', 'exists:stadiums,id'],
            'main_stadium_id' => 'nullable|integer|exists:stadiums,id',
        ];
    }

    public function messages(): array
    {
        return [
            'stadium_ids.required' => 'اختر ملعباً واحداً على الأقل',
            'stadium_ids.*.exists' => 'أحد الملاعب المحددة غير موجود',
            'stadium_ids.*.distinct' => 'لا يمكن تكرار نفس الملعب',
        ];
    }
}
