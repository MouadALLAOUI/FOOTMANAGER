<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StorePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    protected function prepareForValidation(): void
    {
        $this->mergeIfMissing([
            'currency' => 'MAD',
            'billing_interval' => 'monthly',
            'is_active' => true,
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'slug' => ['required', 'string', 'max:255', 'regex:/^[a-z0-9][a-z0-9-]*$/', 'unique:plans,slug'],
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
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
            'name.required' => 'اسم الخطة مطلوب.',
            'slug.required' => 'معرف الخطة مطلوب.',
            'slug.unique' => 'هذا المعرف مستخدم بالفعل.',
            'slug.regex' => 'المعرف يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط.',
            'price.required' => 'سعر الخطة مطلوب.',
            'price.min' => 'السعر لا يمكن أن يكون سالباً.',
        ];
    }
}
