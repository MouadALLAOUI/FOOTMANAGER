<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class StoreTournamentNewsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'cover' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:' . (int) config('tournament.news.cover.max_size_kb', 5120)],
            'status' => ['required', 'in:draft,published'],
            'published_at' => ['nullable', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'عنوان الخبر مطلوب',
            'content.required' => 'محتوى الخبر مطلوب',
            'cover.image' => 'الملف المرفوع ليس صورة صالحة',
            'cover.mimes' => 'صيغة الصورة غير مدعومة — يُسمح فقط بـ JPG أو PNG أو WEBP',
            'cover.max' => 'حجم الصورة يتجاوز الحد الأقصى المسموح',
            'status.in' => 'حالة النشر غير صالحة',
        ];
    }
}
