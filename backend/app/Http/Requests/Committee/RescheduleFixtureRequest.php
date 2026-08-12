<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class RescheduleFixtureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'scheduled_at' => 'required|date',
            'stadium_id' => 'nullable|integer|exists:stadiums,id',
        ];
    }

    public function messages(): array
    {
        return [
            'scheduled_at.required' => 'حدد الموعد الجديد للمباراة',
            'scheduled_at.date' => 'صيغة الموعد غير صحيحة',
            'stadium_id.exists' => 'الملعب المحدد غير موجود',
        ];
    }
}
