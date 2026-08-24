<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class BulkCreateFreeTeamsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'names' => 'required|array|min:1|max:30',
            'names.*' => 'required|string|max:60',
        ];
    }

    public function messages(): array
    {
        return [
            'names.required' => 'قائمة الأسماء مطلوبة',
            'names.min' => 'أضف اسم فريق واحد على الأقل',
            'names.max' => 'لا يمكن إضافة أكثر من 30 فريقاً في المرة الواحدة',
            'names.*.required' => 'اسم الفريق مطلوب',
            'names.*.max' => 'اسم الفريق يجب ألا يتجاوز 60 حرفاً',
        ];
    }
}
