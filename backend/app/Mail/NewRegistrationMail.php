<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewRegistrationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $type,
        public string $name,
        public string $phone,
        public ?string $email = null,
        public ?string $teamName = null,
        public ?string $teamCategory = null,
        public ?string $approvalUrl = null,
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->type === 'terrain_owner'
            ? 'طلب جديد لصاحب تيران بانتظار موافقتك'
            : 'طلب جديد من مسير فريق بانتظار موافقتك';

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.new-registration',
        );
    }
}
