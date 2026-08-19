<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ReorderPlansRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'order' => 'required|array',
            'order.*' => 'required|integer|exists:plans,id',
        ];
    }

    public function messages(): array
    {
        return [
            'order.required' => 'قائمة الترتيب مطلوبة.',
            'order.*.exists' => 'إحدى الخطط غير موجودة.',
        ];
    }
}
