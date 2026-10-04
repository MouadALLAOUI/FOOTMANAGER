<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSquadPlayerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|required|string|max:120',
            'number' => 'sometimes|nullable|integer|min:0|max:99',
            'position' => 'sometimes|nullable|string|max:100',
            'status' => 'sometimes|nullable|string|in:active,suspended,injured,unavailable',
            'photo' => 'sometimes|nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            'remove_photo' => 'sometimes|nullable|boolean',
            'is_essential' => 'sometimes|nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم اللاعب مطلوب',
            'name.max' => 'اسم اللاعب يجب ألا يتجاوز 120 حرفاً',
            'number.integer' => 'رقم القميص يجب أن يكون رقماً',
            'number.min' => 'رقم القميص يجب أن يكون 0 أو أكثر',
            'number.max' => 'رقم القميص يجب ألا يتجاوز 99',
            'photo.image' => 'الملف يجب أن يكون صورة',
            'photo.max' => 'حجم الصورة يجب ألا يتجاوز 5 ميغابايت',
        ];
    }
}