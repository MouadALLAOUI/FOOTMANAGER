<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Notification\Services\WhatsAppNotificationService;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentContactMessage;

class TournamentContactService
{
    public function __construct(
        private readonly WhatsAppNotificationService $whatsapp,
    ) {}

    /**
     * Contact/social payload for both the committee editor and the public page.
     *
     * Only configured fields are included; the WhatsApp link is always built
     * server-side from the stored number using the project convention.
     */
    public function contactPayload(Tournament $tournament): array
    {
        return [
            'phone' => $tournament->contact_phone,
            'email' => $tournament->contact_email,
            'whatsapp_number' => $tournament->whatsapp_number,
            'whatsapp_link' => $this->whatsapp->contactLink((string) $tournament->whatsapp_number),
            'facebook_url' => $tournament->facebook_url,
            'instagram_url' => $tournament->instagram_url,
            'tiktok_url' => $tournament->tiktok_url,
            'youtube_url' => $tournament->youtube_url,
            'location' => $tournament->location,
        ];
    }

    /**
     * @param  array<string, string|null>  $data
     */
    public function updateContact(Tournament $tournament, array $data): Tournament
    {
        $fields = [
            'contact_phone',
            'contact_email',
            'whatsapp_number',
            'facebook_url',
            'instagram_url',
            'tiktok_url',
            'youtube_url',
        ];

        foreach ($fields as $field) {
            $tournament->{$field} = array_key_exists($field, $data) && $data[$field] !== ''
                ? $data[$field]
                : null;
        }

        $tournament->save();

        return $tournament;
    }

    /**
     * @param  array{name: string, email: string, phone?: string|null, subject: string, message: string}  $data
     */
    public function submitMessage(Tournament $tournament, array $data, ?string $ip = null): TournamentContactMessage
    {
        $message = new TournamentContactMessage([
            'tournament_id' => $tournament->id,
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'subject' => $data['subject'],
            'message' => $data['message'],
            'status' => TournamentContactMessage::STATUS_NEW,
            'ip_address' => $ip,
        ]);

        $message->save();

        return $message;
    }

    public function setStatus(Tournament $tournament, TournamentContactMessage $message, string $status): TournamentContactMessage
    {
        $this->assertBelongsToTournament($tournament, $message);

        $message->status = $status;
        $message->save();

        return $message;
    }

    public function deleteMessage(Tournament $tournament, TournamentContactMessage $message): void
    {
        $this->assertBelongsToTournament($tournament, $message);

        $message->delete();
    }

    private function assertBelongsToTournament(Tournament $tournament, TournamentContactMessage $message): void
    {
        if ((int) $message->tournament_id !== (int) $tournament->id) {
            abort(404);
        }
    }
}
