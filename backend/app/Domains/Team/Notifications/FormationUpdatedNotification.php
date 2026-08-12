<?php

namespace App\Domains\Team\Notifications;

use App\Domains\Team\Models\Team;
use App\Domains\Team\Models\TeamFormation;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class FormationUpdatedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private Team $team,
        private ?TeamFormation $formation = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $formationLabel = $this->formation?->formation ?: $this->formation?->name ?: 'التشكيلة';
        $teamName = $this->team->name ?? 'الفريق';

        return (new MailMessage)
            ->subject("تم تحديث تشكيلة الفريق — {$teamName}")
            ->greeting('مرحباً،')
            ->line("قام مدير فريق {$teamName} بتحديث التشكيلة ({$formationLabel}).")
            ->line('تحقق من التشكيلة الجديدة لمعرفة مركزك.')
            ->action('عرض التشكيلة', url('/dashboard/team/formation'))
            ->line('شكراً لاستخدامك منصة FootMANAGER.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'formation_updated',
            'team_id' => $this->team->id,
            'team_name' => $this->team->name,
            'formation' => $this->formation?->formation,
        ];
    }
}
