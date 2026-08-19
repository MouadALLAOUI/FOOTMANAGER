<?php

namespace App\Http\Requests\Committee;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTournamentContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'committee';
    }

    public function rules(): array
    {
        return [
            'contact_phone' => ['nullable', 'string', 'max:30', 'regex:/^\+?[0-9][0-9\s\-]{4,}$/'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'whatsapp_number' => ['nullable', 'string', 'max:30', 'regex:/^\+?[0-9][0-9\s\-]{4,}$/'],
            'facebook_url' => ['nullable', 'string', 'max:255', 'starts_with:https://', fn ($attribute, $value, $fail) => $this->assertSocialUrl($value, 'facebook', $fail)],
            'instagram_url' => ['nullable', 'string', 'max:255', 'starts_with:https://', fn ($attribute, $value, $fail) => $this->assertSocialUrl($value, 'instagram', $fail)],
            'tiktok_url' => ['nullable', 'string', 'max:255', 'starts_with:https://', fn ($attribute, $value, $fail) => $this->assertSocialUrl($value, 'tiktok', $fail)],
            'youtube_url' => ['nullable', 'string', 'max:255', 'starts_with:https://', fn ($attribute, $value, $fail) => $this->assertSocialUrl($value, 'youtube', $fail)],
        ];
    }

    public function messages(): array
    {
        return [
            'contact_phone.regex' => 'رقم الهاتف غير صالح',
            'contact_email.email' => 'البريد الإلكتروني غير صالح',
            'whatsapp_number.regex' => 'رقم الواتساب غير صالح',
            'facebook_url.starts_with' => 'رابط فيسبوك يجب أن يبدأ بـ https://',
            'instagram_url.starts_with' => 'رابط انستغرام يجب أن يبدأ بـ https://',
            'tiktok_url.starts_with' => 'رابط تيك توك يجب أن يبدأ بـ https://',
            'youtube_url.starts_with' => 'رابط يوتيوب يجب أن يبدأ بـ https://',
        ];
    }

    private function assertSocialUrl(?string $value, string $network, callable $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        $patterns = [
            'facebook' => '#^https://(www\.|m\.|mobile\.)?(facebook\.com|fb\.com)/#i',
            'instagram' => '#^https://(www\.)?instagram\.com/#i',
            'tiktok' => '#^https://(www\.|vm\.|vt\.)?tiktok\.com/#i',
            'youtube' => '#^https://(www\.|m\.)?(youtube\.com/|youtu\.be/)#i',
        ];

        if (! preg_match($patterns[$network] ?? '#$^#', $value)) {
            $labels = [
                'facebook' => 'رابط فيسبوك غير صالح، يجب أن يكون https://facebook.com/...',
                'instagram' => 'رابط انستغرام غير صالح، يجب أن يكون https://instagram.com/...',
                'tiktok' => 'رابط تيك توك غير صالح، يجب أن يكون https://tiktok.com/...',
                'youtube' => 'رابط يوتيوب غير صالح، يجب أن يكون https://youtube.com/...',
            ];

            $fail($labels[$network]);
        }
    }
}
