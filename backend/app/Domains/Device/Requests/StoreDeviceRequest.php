<?php

namespace App\Domains\Device\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDeviceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string', 'max:512'],
            'platform' => ['required', 'string', 'in:ios,android'],
        ];
    }
}