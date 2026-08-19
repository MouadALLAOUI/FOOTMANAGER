<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;

class StoreContactMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^\+?[0-9][0-9\s\-]{4,}$/'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'min:10', 'max:2000'],
            // Honeypot: hidden field bots tend to fill. Must stay empty.
            'website' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'الاسم مطلوب',
            'name.max' => 'الاسم طويل جداً',
            'email.required' => 'البريد الإلكتروني مطلوب',
            'email.email' => 'البريد الإلكتروني غير صالح',
            'email.max' => 'البريد الإلكتروني طويل جداً',
            'phone.regex' => 'رقم الهاتف غير صالح',
            'subject.required' => 'الموضوع مطلوب',
            'subject.max' => 'الموضوع طويل جداً',
            'message.required' => 'الرسالة مطلوبة',
            'message.min' => 'الرسالة قصيرة جداً (10 أحرف على الأقل)',
            'message.max' => 'الرسالة طويلة جداً (2000 حرف كحد أقصى)',
        ];
    }
}
