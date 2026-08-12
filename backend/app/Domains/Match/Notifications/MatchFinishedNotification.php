<?php

namespace App\Domains\Match\Notifications;

use App\Domains\Match\Models\FootballMatch;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MatchFinishedNotification extends Notification
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
        $score = $this->scoreForTeam();

        return (new MailMessage)
            ->subject('انتهت المباراة — FootMANAGER')
            ->greeting('مرحباً،')
            ->line('انتهت مباراتكم ضد '.$this->opponentName().' بنتيجة '.$score.'.')
            ->action('عرض التفاصيل', url('/dashboard/matches'))
            ->line('نتطلع لمباريات قادمة موفقّة!');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'match_finished',
            'match_id' => $this->match->id,
            'match_uuid' => $this->match->uuid,
            'team_id' => $this->teamId,
            'home_score' => $this->match->home_score,
            'away_score' => $this->match->away_score,
            'message' => 'انتهت المباراة ضد '.$this->opponentName().' بنتيجة '.$this->scoreForTeam().'.',
        ];
    }

    protected function opponentName(): string
    {
        if ((int) $this->teamId === (int) $this->match->home_team_id) {
            return $this->match->awayTeam?->name ?? 'الفريق المنافس';
        }

        return $this->match->homeTeam?->name ?? 'الفريق المنافس';
    }

    protected function scoreForTeam(): string
    {
        if ((int) $this->teamId === (int) $this->match->home_team_id) {
            return $this->match->home_score.'-'.$this->match->away_score;
        }

        return $this->match->away_score.'-'.$this->match->home_score;
    }
}
