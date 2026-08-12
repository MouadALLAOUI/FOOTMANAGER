<?php

namespace App\Domains\Team\Listeners;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Events\AnnouncementPublished;
use App\Domains\Team\Notifications\AnnouncementPublishedNotification;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class AnnouncementPublishedListener implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(AnnouncementPublished $event): void
    {
        $announcement = $event->announcement;

        TeamCache::flushTeam($announcement->team_id);

        $query = Player::where('team_id', $announcement->team_id)->whereNotNull('user_id');

        if ($announcement->visibility === 'specific' && $announcement->target_player_ids) {
            $query->whereIn('id', $announcement->target_player_ids);
        }

        $userIds = $query->pluck('user_id');

        User::whereIn('id', $userIds)->get()->each(function (User $user) use ($announcement) {
            $user->notify(new AnnouncementPublishedNotification($announcement));
        });
    }
}
