<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePlanDiscountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'type' => 'required|in:percentage,fixed',
            'value' => 'required|numeric|min:0',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'is_active' => 'sometimes|boolean',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $type = $this->input('type');
            $value = (float) $this->input('value');
            $plan = $this->route('plan');

            if ($type === 'percentage' && $value > 100) {
                $validator->errors()->add('value', 'نسبة الخصم يجب ألا تتجاوز 100%.');
            }

            if ($type === 'fixed' && $plan && $value > (float) $plan->price) {
                $validator->errors()->add('value', 'قيمة الخصم يجب ألا تتجاوز سعر الخطة.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'type.required' => 'نوع الخصم مطلوب.',
            'type.in' => 'نوع الخصم غير صالح.',
            'value.required' => 'قيمة الخصم مطلوبة.',
            'value.min' => 'قيمة الخصم لا يمكن أن تكون سالبة.',
            'ends_at.after_or_equal' => 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية أو مساوياً له.',
        ];
    }
}
