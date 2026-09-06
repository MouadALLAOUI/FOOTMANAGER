<?php

namespace App\Domains\Team\Requests;

use App\Domains\Team\Support\FormationPresets;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class FormationRequest extends FormRequest
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
            'formation' => ['nullable', 'string', 'max:20'],
            // Built-in keys (e.g. "5v5_2_2") and manager-created keys
            // ("custom:{id}") are resolved by TeamFormationService::validatePreset.
            'preset_key' => ['nullable', 'string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
            'captain_id' => ['nullable', 'integer', 'exists:players,id'],
            'vice_captain_id' => ['nullable', 'integer', 'exists:players,id'],
            'free_kick_taker_id' => ['nullable', 'integer', 'exists:players,id'],
            'penalty_taker_id' => ['nullable', 'integer', 'exists:players,id'],
            'corner_taker_id' => ['nullable', 'integer', 'exists:players,id'],
            'players' => ['present', 'array'],
            'players.*.player_id' => ['required', 'integer', 'distinct', 'exists:players,id'],
            'players.*.is_starter' => ['required', 'boolean'],
            'players.*.tactical_position' => ['nullable', 'string', 'max:10', Rule::in(FormationPresets::validPositions())],
            'players.*.x' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'players.*.y' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'players.*.sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'format.in' => 'صيغة اللعب غير مدعومة',
            'players.*.player_id.distinct' => 'لا يمكن تكرار نفس اللاعب في التشكيلة',
            'players.*.player_id.exists' => 'أحد اللاعبين المحددين غير موجود',
            'players.*.tactical_position.in' => 'المركز التكتيكي غير صالح',
            'players.*.x.max' => 'إحداثيات اللاعب يجب أن تكون بين 0.0 و 1.0',
            'players.*.y.max' => 'إحداثيات اللاعب يجب أن تكون بين 0.0 و 1.0',
        ];
    }
}
