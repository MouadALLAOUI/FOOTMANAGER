<?php

namespace App\Domains\Team\Requests;

use App\Domains\Team\Support\FormationPresets;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFormationPresetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'slots' => ['sometimes', 'nullable', 'array', 'min:1'],
            'slots.*.tactical_position' => ['required_with:slots', 'string', 'max:10', Rule::in(FormationPresets::validPositions())],
            'slots.*.x' => ['required_with:slots', 'numeric', 'min:0', 'max:1'],
            'slots.*.y' => ['required_with:slots', 'numeric', 'min:0', 'max:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'slots.*.tactical_position.in' => 'المركز التكتيكي غير صالح',
            'slots.*.x.max' => 'إحداثيات اللاعب يجب أن تكون بين 0.0 و 1.0',
            'slots.*.y.max' => 'إحداثيات اللاعب يجب أن تكون بين 0.0 و 1.0',
        ];
    }
}