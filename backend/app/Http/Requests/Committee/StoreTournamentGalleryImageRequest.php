<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class StoreTournamentGalleryImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'image' => ['required', 'image', 'mimes:' . implode(',', config('tournament.gallery.allowed_mimes', ['jpeg', 'png', 'jpg', 'webp'])), 'max:' . (int) config('tournament.gallery.max_size_kb', 4096)],
            'caption' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'image.required' => 'يجب اختيار صورة',
            'image.image' => 'الملف المرفوع ليس صورة صالحة',
            'image.mimes' => 'صيغة الصورة غير مدعومة — يُسمح فقط بـ JPG أو PNG أو WEBP',
            'image.max' => 'حجم الصورة يتجاوز الحد الأقصى (4MB)',
            'image.uploaded' => 'فشل تحميل الصورة — حجمها أكبر من المسموح به',
        ];
    }
}
