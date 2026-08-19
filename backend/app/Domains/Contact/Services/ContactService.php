<?php

namespace App\Domains\Contact\Services;

use App\Domains\Contact\Models\ContactMessage;
use App\Domains\Notification\Services\WhatsAppNotificationService;
use App\Models\Setting;

class ContactService
{
    public function __construct(
        private readonly WhatsAppNotificationService $whatsapp,
    ) {}

    /**
     * Platform contact payload for the public contact page.
     *
     * Only configured settings are included; the WhatsApp link is always
     * built server-side from the stored number using the project convention.
     */
    public function contactPayload(): array
    {
        return [
            'phone' => Setting::get('contact_phone', ''),
            'email' => Setting::get('contact_email', ''),
            'whatsapp_number' => Setting::get('whatsapp_number', ''),
            'whatsapp_link' => $this->whatsapp->contactLink((string) Setting::get('whatsapp_number', '')),
            'facebook_url' => Setting::get('facebook_url', ''),
            'instagram_url' => Setting::get('instagram_url', ''),
            'address' => Setting::get('contact_address', ''),
            'working_hours' => Setting::get('working_hours', ''),
        ];
    }

    /**
     * @param  array{name: string, email: string, phone?: string|null, subject: string, message: string}  $data
     */
    public function submitMessage(array $data, ?string $ip = null): ContactMessage
    {
        $message = new ContactMessage([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'subject' => $data['subject'],
            'message' => $data['message'],
            'status' => ContactMessage::STATUS_NEW,
            'ip_address' => $ip,
        ]);

        $message->save();

        return $message;
    }

    public function setStatus(ContactMessage $message, string $status): ContactMessage
    {
        $message->status = $status;
        $message->save();

        return $message;
    }

    public function deleteMessage(ContactMessage $message): void
    {
        $message->delete();
    }
}
