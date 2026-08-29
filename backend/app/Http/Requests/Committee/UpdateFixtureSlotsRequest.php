<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFixtureSlotsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'slots' => 'required|array|min:1',
            'slots.*.id' => 'required|integer|exists:fixtures,id',
            'slots.*.side' => 'required|in:home,away,bye',
            'slots.*.team_id' => 'nullable|integer|exists:teams,id',
        ];
    }

    public function messages(): array
    {
        return [
            'slots.required' => 'لا توجد تغييرات لحفظها',
            'slots.*.id.exists' => 'مباراة غير موجودة',
            'slots.*.side.in' => 'الجهة المحددة غير صالحة',
            'slots.*.team_id.exists' => 'الفريق المحدد غير موجود',
        ];
    }
}