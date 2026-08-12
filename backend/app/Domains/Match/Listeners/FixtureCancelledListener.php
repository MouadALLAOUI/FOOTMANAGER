<?php

namespace App\Domains\Match\Listeners;

use App\Domains\Match\Events\FixtureCancelled;
use App\Domains\Match\Notifications\MatchCancelledNotification;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Support\TeamCache;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class FixtureCancelledListener implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(FixtureCancelled $event): void
    {
        $teamIds = array_unique([
            $event->match->host_team_id,
            $event->match->opponent_team_id,
        ]);

        foreach ($teamIds as $teamId) {
            if (! $teamId) {
                continue;
            }

            TeamCache::flushTeam((int) $teamId);

            $userIds = Player::where('team_id', $teamId)->whereNotNull('user_id')->pluck('user_id');

            User::whereIn('id', $userIds)->get()->each(function (User $user) use ($event, $teamId) {
                $user->notify(new MatchCancelledNotification($event->match, (int) $teamId));
            });
        }
    }
}
