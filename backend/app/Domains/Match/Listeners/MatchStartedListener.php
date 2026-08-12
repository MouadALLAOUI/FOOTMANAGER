<?php

namespace App\Domains\Match\Listeners;

use App\Domains\Match\Events\MatchStarted;
use App\Domains\Match\Notifications\MatchStartedNotification;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Support\TeamCache;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class MatchStartedListener implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(MatchStarted $event): void
    {
        $teamIds = array_unique([
            $event->match->home_team_id,
            $event->match->away_team_id,
        ]);

        foreach ($teamIds as $teamId) {
            if (! $teamId) {
                continue;
            }

            TeamCache::flushTeam((int) $teamId);

            $userIds = Player::query()
                ->where('team_id', $teamId)
                ->whereNotNull('user_id')
                ->pluck('user_id');

            User::query()
                ->whereIn('id', $userIds)
                ->get()
                ->each(function (User $user) use ($event, $teamId) {
                    $user->notify(new MatchStartedNotification($event->match, (int) $teamId));
                });
        }
    }
}
