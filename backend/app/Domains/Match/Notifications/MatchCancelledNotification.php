<?php

namespace App\Domains\Match\Notifications;

use App\Domains\Match\Models\MatchRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MatchCancelledNotification extends Notification
{
    use Queueable;

    public function __construct(
        private MatchRequest $match,
        private int $teamId,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('تم إلغاء مباراة — FootMANAGER')
            ->greeting('مرحباً،')
            ->line('نأسف لإبلاغك أن مباراة كانت مقررة قد تم إلغاؤها.')
            ->line('التاريخ المقرر: '.$this->match->match_datetime?->format('Y-m-d H:i'))
            ->action('عرض المباريات', url('/dashboard/matches'))
            ->line('شكراً لاستخدامك منصة FootMANAGER.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'match_cancelled',
            'match_id' => $this->match->id,
            'match_datetime' => $this->match->match_datetime?->toDateTimeString(),
        ];
    }
}
