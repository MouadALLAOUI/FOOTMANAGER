<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'slug' => ['sometimes', 'string', 'max:255', 'regex:/^[a-z0-9][a-z0-9-]*$/', Rule::unique('plans', 'slug')->ignore($this->route('plan')?->id)],
            'description' => 'nullable|string',
            'price' => 'sometimes|numeric|min:0',
            'currency' => 'sometimes|string|size:3',
            'billing_interval' => 'sometimes|in:monthly,yearly',
            'is_free' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
            'display_order' => 'sometimes|integer|min:0',
            'badge' => 'nullable|string|max:50',
        ];
    }

    public function messages(): array
    {
        return [
            'slug.unique' => 'هذا المعرف مستخدم بالفعل.',
            'slug.regex' => 'المعرف يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط.',
            'price.min' => 'السعر لا يمكن أن يكون سالباً.',
        ];
    }
}
