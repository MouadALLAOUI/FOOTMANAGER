<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class StoreBulkSquadPlayersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'players' => 'required|array|min:1|max:30',
            'players.*.name' => 'required|string|max:120',
            'players.*.number' => 'nullable|integer|min:0|max:99',
        ];
    }

    public function messages(): array
    {
        return [
            'players.required' => 'قائمة اللاعبين مطلوبة',
            'players.min' => 'أضف لاعباً واحداً على الأقل',
            'players.max' => 'لا يمكن إضافة أكثر من 30 لاعباً في المرة الواحدة',
            'players.*.name.required' => 'اسم اللاعب مطلوب',
            'players.*.name.max' => 'اسم اللاعب يجب ألا يتجاوز 120 حرفاً',
            'players.*.number.integer' => 'رقم القميص يجب أن يكون رقماً',
            'players.*.number.min' => 'رقم القميص يجب أن يكون 0 أو أكثر',
            'players.*.number.max' => 'رقم القميص يجب ألا يتجاوز 99',
        ];
    }
}