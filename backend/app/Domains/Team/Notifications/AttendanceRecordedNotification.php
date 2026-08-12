<?php

namespace App\Domains\Team\Notifications;

use App\Domains\Team\Models\Team;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AttendanceRecordedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private Team $team,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('تم تسجيل الحضور — '.($this->team->name ?? 'الفريق'))
            ->greeting('مرحباً،')
            ->line('تم تسجيل حضورك من طرف مدير الفريق.')
            ->action('عرض سجل الحضور', url('/dashboard/team/attendance'))
            ->line('شكراً لاستخدامك منصة FootMANAGER.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'attendance_recorded',
            'team_id' => $this->team->id,
            'team_name' => $this->team->name,
        ];
    }
}
