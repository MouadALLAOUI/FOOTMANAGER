<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class ResolveFoulSuggestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'event_id' => ['required', 'integer'],
            'action_confirm' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'event_id.required' => 'حدث التقرير مطلوب',
        ];
    }
}