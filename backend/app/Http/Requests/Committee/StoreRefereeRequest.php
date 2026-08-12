<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class StoreRefereeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:120',
            'phone' => 'nullable|string|max:30',
            'position' => 'nullable|string|max:60',
            'user_id' => 'nullable|integer|exists:users,id',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم الحكم مطلوب',
        ];
    }
}
