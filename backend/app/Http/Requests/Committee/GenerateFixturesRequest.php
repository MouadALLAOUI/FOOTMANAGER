<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class GenerateFixturesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'stage' => 'nullable|in:group,knockout',
            'conflict_strategy' => 'nullable|in:abort,auto_roll,skip',
            'starts_on' => 'nullable|date',
            'stadium_ids' => 'nullable|array|max:32',
            'stadium_ids.*' => 'integer|exists:stadiums,id',
            'default_time' => 'nullable|date_format:H:i',
            'double_round_robin' => 'nullable|boolean',
            'regenerate' => 'nullable|boolean',
            'team_ids' => 'nullable|array',
            'team_ids.*' => 'integer',
        ];
    }

    public function messages(): array
    {
        return [
            'stadium_ids.*.exists' => 'أحد الملاعب المحددة غير موجود',
            'default_time.date_format' => 'صيغة التوقيت يجب أن تكون HH:MM',
            'stage.in' => 'المرحلة المحددة غير صالحة',
            'conflict_strategy.in' => 'استراتيجية التعارض المحددة غير صالحة',
        ];
    }
}
