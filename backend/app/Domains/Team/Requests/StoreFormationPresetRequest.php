<?php

namespace App\Domains\Team\Requests;

use App\Domains\Team\Support\FormationPresets;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFormationPresetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'format' => ['required', 'string', 'in:'.implode(',', FormationPresets::formats())],
            'slots' => ['required', 'array', 'min:1'],
            'slots.*.tactical_position' => ['required', 'string', 'max:10', Rule::in(FormationPresets::validPositions())],
            'slots.*.x' => ['required', 'numeric', 'min:0', 'max:1'],
            'slots.*.y' => ['required', 'numeric', 'min:0', 'max:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'format.in' => 'صيغة اللعب غير مدعومة',
            'slots.*.tactical_position.in' => 'المركز التكتيكي غير صالح',
            'slots.*.x.max' => 'إحداثيات اللاعب يجب أن تكون بين 0.0 و 1.0',
            'slots.*.y.max' => 'إحداثيات اللاعب يجب أن تكون بين 0.0 و 1.0',
        ];
    }
}