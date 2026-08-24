<?php

namespace App\Domains\Match\Listeners;

use App\Domains\Match\Events\GoalScored;
use App\Domains\Match\Notifications\GoalScoredNotification;
use App\Domains\Player\Models\Player;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class GoalScoredListener implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(GoalScored $event): void
    {
        $this->updatePerformances($event);

        $scoringTeamId = $event->event->team_id;

        if (! $scoringTeamId) {
            return;
        }

        $homeTeamId = $event->match->home_team_id;
        $awayTeamId = $event->match->away_team_id;
        $teamIds = array_filter([$homeTeamId, $awayTeamId]);

        foreach ($teamIds as $teamId) {
            $userIds = Player::query()
                ->where('team_id', $teamId)
                ->whereNotNull('user_id')
                ->pluck('user_id');

            User::query()
                ->whereIn('id', $userIds)
                ->get()
                ->each(function (User $user) use ($event, $teamId, $scoringTeamId) {
                    $user->notify(new GoalScoredNotification($event->match, $event->event, (int) $teamId));
                });
        }
    }

    protected function updatePerformances(GoalScored $event): void
    {
        $event->match->performances()
            ->where('player_id', $event->event->player_id)
            ->increment('goals');

        if ($event->event->assist_player_id) {
            $event->match->performances()
                ->where('player_id', $event->event->assist_player_id)
                ->increment('assists');
        }
    }
}
