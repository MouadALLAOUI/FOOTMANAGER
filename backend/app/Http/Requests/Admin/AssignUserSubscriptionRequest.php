<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AssignUserSubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'plan_id' => 'required|exists:plans,id',
        ];
    }

    public function messages(): array
    {
        return [
            'plan_id.required' => 'معرف الخطة مطلوب.',
            'plan_id.exists' => 'الخطة المحددة غير موجودة.',
        ];
    }
}
