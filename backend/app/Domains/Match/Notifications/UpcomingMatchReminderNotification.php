<?php

namespace App\Domains\Match\Notifications;

use App\Domains\Match\Models\MatchRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class UpcomingMatchReminderNotification extends Notification
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
        $stadium = $this->match->stadium?->name ?? $this->match->custom_terrain_name ?? 'الملعب';

        return (new MailMessage)
            ->subject('تذكير بمباراة قادمة — FootMANAGER')
            ->greeting('مرحباً،')
            ->line('لديك مباراة قادمة:')
            ->line('التاريخ: '.$this->match->match_datetime?->format('Y-m-d'))
            ->line('التوقيت: '.$this->match->match_datetime?->format('H:i'))
            ->line('الملعب: '.$stadium)
            ->action('عرض المباراة', url('/dashboard/matches'))
            ->line('لا تنسَ الحضور في الوقت المحدد!');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'upcoming_match_reminder',
            'match_id' => $this->match->id,
            'match_datetime' => $this->match->match_datetime?->toDateTimeString(),
        ];
    }
}
