<?php

namespace App\Domains\Match\Notifications;

use App\Domains\Match\Models\FootballMatch;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MatchStartedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private FootballMatch $match,
        private int $teamId,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $opponent = $this->opponentName();

        return (new MailMessage)
            ->subject('بدأت المباراة — FootMANAGER')
            ->greeting('مرحباً،')
            ->line('بدأت مباراتكم ضد '.$opponent.' الآن!')
            ->action('متابعة المباراة', url('/dashboard/live'))
            ->line('لا تفوّت أي لحظة من المباراة.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'match_started',
            'match_id' => $this->match->id,
            'match_uuid' => $this->match->uuid,
            'team_id' => $this->teamId,
            'message' => 'بدأت مباراتكم ضد '.$this->opponentName().' الآن!',
        ];
    }

    protected function opponentName(): string
    {
        if ((int) $this->teamId === (int) $this->match->home_team_id) {
            return $this->match->awayTeam?->name ?? 'الفريق المنافس';
        }

        return $this->match->homeTeam?->name ?? 'الفريق المنافس';
    }
}
