<?php

namespace App\Domains\Team\Notifications;

use App\Domains\Team\Models\TeamAnnouncement;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AnnouncementPublishedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private TeamAnnouncement $announcement,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $teamName = $this->announcement->team?->name ?? 'الفريق';

        return (new MailMessage)
            ->subject('إعلان جديد — '.$this->announcement->title)
            ->greeting("مرحباً، فريق {$teamName}")
            ->line($this->announcement->title)
            ->line($this->announcement->message)
            ->action('عرض الإعلان', url('/dashboard/team/announcements'))
            ->line('شكراً لاستخدامك منصة FootMANAGER.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'announcement_published',
            'announcement_id' => $this->announcement->id,
            'title' => $this->announcement->title,
            'priority' => $this->announcement->priority,
        ];
    }
}
