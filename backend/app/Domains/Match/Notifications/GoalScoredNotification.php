<?php

namespace App\Domains\Match\Notifications;

use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchEvent;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class GoalScoredNotification extends Notification
{
    use Queueable;

    public function __construct(
        private FootballMatch $match,
        private MatchEvent $event,
        private int $teamId,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $scoredByUs = (int) $this->event->team_id === (int) $this->teamId;

        return [
            'type' => 'goal_scored',
            'match_id' => $this->match->id,
            'match_uuid' => $this->match->uuid,
            'event_id' => $this->event->id,
            'team_id' => $this->event->team_id,
            'minute' => $this->event->minute,
            'home_score' => $this->match->home_score,
            'away_score' => $this->match->away_score,
            'message' => $scoredByUs
                ? 'سجّل فريقنا هدفاً في الدقيقة '.$this->event->minute.'!'
                : 'سجّل الخصم هدفاً في الدقيقة '.$this->event->minute.'.',
        ];
    }
}
