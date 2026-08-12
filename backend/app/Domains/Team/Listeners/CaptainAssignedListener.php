<?php

namespace App\Domains\Team\Listeners;

use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Events\CaptainAssigned;
use App\Domains\Team\Notifications\CaptainAssignedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class CaptainAssignedListener implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(CaptainAssigned $event): void
    {
        TeamCache::flushTeam($event->team->id);

        $user = $event->player->user;

        if ($user) {
            $user->notify(new CaptainAssignedNotification($event->team, $event->isVice));
        }
    }
}
