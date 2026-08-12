<?php

namespace App\Http\Requests\Player;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePlayerProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'position' => ['sometimes', 'nullable', 'in:goalkeeper,defender,midfielder,forward'],
            'skill_level' => ['sometimes', 'nullable', 'in:beginner,amateur,semi_pro,pro'],
            'birth_date' => ['sometimes', 'nullable', 'date', 'before_or_equal:today'],
            'birth_year' => ['sometimes', 'nullable', 'integer', 'min:1950', 'max:'.date('Y')],
            'nationality' => ['sometimes', 'nullable', 'string', 'max:100'],
            'height_cm' => ['sometimes', 'nullable', 'integer', 'between:100,250'],
            'weight_kg' => ['sometimes', 'nullable', 'integer', 'between:30,250'],
            'preferred_foot' => ['sometimes', 'nullable', 'in:left,right,both'],
            'strong_foot' => ['sometimes', 'nullable', 'in:left,right,both'],
            'secondary_positions' => ['sometimes', 'nullable', 'array'],
            'secondary_positions.*' => ['string', 'in:goalkeeper,defender,midfielder,forward'],
            'preferred_formats' => ['sometimes', 'nullable', 'array'],
            'preferred_formats.*' => ['integer'],
            'preferred_cities' => ['sometimes', 'nullable', 'array'],
            'preferred_cities.*' => ['string', 'max:100'],
            'city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'visibility' => ['sometimes', 'in:public,private'],
            'contact_visibility' => ['sometimes', 'in:public,team,private'],
            'recruitment_available' => ['sometimes', 'boolean'],
        ];
    }
}
