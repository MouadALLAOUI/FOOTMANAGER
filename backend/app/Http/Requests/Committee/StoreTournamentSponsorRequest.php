<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class StoreTournamentSponsorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'logo' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:' . (int) config('tournament.sponsors.logo.max_size_kb', 2048)],
            'link' => ['nullable', 'string', 'max:255'],
            'level' => ['nullable', 'string', 'max:100'],
            'order_index' => ['nullable', 'integer', 'min:0', 'max:10000'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'اسم الراعي مطلوب',
            'logo.image' => 'الملف المرفوع ليس صورة صالحة',
            'logo.mimes' => 'صيغة الشعار غير مدعومة — يُسمح فقط بـ JPG أو PNG أو WEBP',
            'logo.max' => 'حجم الشعار يتجاوز الحد الأقصى (2MB)',
        ];
    }
}
