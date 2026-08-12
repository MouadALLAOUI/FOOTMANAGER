<?php

namespace App\Domains\Team\Notifications;

use App\Domains\Team\Models\Team;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CaptainAssignedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private Team $team,
        private bool $isVice = false,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $role = $this->isVice ? 'نائب الكابتن' : 'الكابتن';
        $teamName = $this->team->name ?? 'الفريق';

        return (new MailMessage)
            ->subject("تم تعيينك {$role} — {$teamName}")
            ->greeting('مرحباً،')
            ->line("تم تعيينك {$role} لفريق {$teamName}.")
            ->line('نتمنى لك التوفيق في مهمتك الجديدة!')
            ->action('عرض الفريق', url('/dashboard/team'))
            ->line('شكراً لاستخدامك منصة FootMANAGER.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => $this->isVice ? 'vice_captain_assigned' : 'captain_assigned',
            'team_id' => $this->team->id,
            'team_name' => $this->team->name,
        ];
    }
}
