<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFreeTeamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        $maxKb = (int) config('team.gallery.max_size_kb', 5120);

        return [
            'name' => 'sometimes|string|max:60',
            'city' => 'nullable|string|max:255',
            'logo' => "sometimes|image|mimes:jpeg,png,jpg,webp|max:{$maxKb}",
            'logo_preset_id' => 'nullable|integer|exists:presets,id',
            'remove_logo' => 'sometimes|boolean',
            'primary_color' => 'nullable|string|max:20',
            'secondary_color' => 'nullable|string|max:20',
        ];
    }

    public function messages(): array
    {
        return [
            'name.max' => 'اسم الفريق يجب ألا يتجاوز 60 حرفاً',
            'city.max' => 'المدينة يجب ألا تتجاوز 255 حرفاً',
            'logo.image' => 'الشعار يجب أن يكون صورة',
            'logo.mimes' => 'صيغة الشعار غير مدعومة (jpeg, png, jpg, webp)',
            'logo.max' => 'الشعار كبير جداً',
        ];
    }
}
