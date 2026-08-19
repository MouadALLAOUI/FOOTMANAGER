<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class SyncPlanFeaturesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'features' => 'required|array',
            'features.*.feature_id' => 'required|integer|exists:features,id',
            'features.*.enabled' => 'required|boolean',
            'features.*.value' => 'nullable|integer|min:0',
            'features.*.is_unlimited' => 'required|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'features.required' => 'قائمة المزايا مطلوبة.',
            'features.*.feature_id.required' => 'الميزة مطلوبة.',
            'features.*.feature_id.exists' => 'الميزة غير موجودة.',
            'features.*.value.min' => 'قيمة الحد لا يمكن أن تكون سالبة.',
        ];
    }
}
