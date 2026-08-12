<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class CreateMatchPlayerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:120',
            'number' => 'nullable|integer|min:0|max:999',
            'position' => 'nullable|string|max:60',
            'notes' => 'nullable|string|max:1000',
            'force' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم اللاعب مطلوب',
        ];
    }
}
