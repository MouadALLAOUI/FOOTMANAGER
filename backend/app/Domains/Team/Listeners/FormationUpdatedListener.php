<?php

namespace App\Domains\Team\Listeners;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Events\FormationUpdated;
use App\Domains\Team\Notifications\FormationUpdatedNotification;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class FormationUpdatedListener implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(FormationUpdated $event): void
    {
        TeamCache::flushTeam($event->team->id);

        $userIds = Player::where('team_id', $event->team->id)
            ->whereNotNull('user_id')
            ->pluck('user_id');

        User::whereIn('id', $userIds)->get()->each(function (User $user) use ($event) {
            $user->notify(new FormationUpdatedNotification($event->team, $event->formation));
        });
    }
}
