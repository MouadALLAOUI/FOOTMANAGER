<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFixtureSlotRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'side' => 'required|in:home,away,bye',
            'team_id' => 'nullable|integer|exists:teams,id',
        ];
    }

    public function messages(): array
    {
        return [
            'side.required' => 'حدد جهة الموقع (مضيف، ضيف، أو استراحة)',
            'side.in' => 'الجهة المحددة غير صالحة',
            'team_id.exists' => 'الفريق المحدد غير موجود',
        ];
    }
}