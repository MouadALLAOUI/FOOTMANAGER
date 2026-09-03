<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class ResolvePenaltyAwardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'outcome_event_id' => ['nullable', 'integer'],
            'outcome' => ['nullable', 'in:converted,missed,saved'],
        ];
    }

    public function messages(): array
    {
        return [
            'outcome.in' => 'نتيجة الركلة غير صالحة',
        ];
    }
}