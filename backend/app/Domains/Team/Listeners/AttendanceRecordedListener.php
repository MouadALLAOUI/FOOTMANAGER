<?php

namespace App\Domains\Team\Listeners;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Events\AttendanceRecorded;
use App\Domains\Team\Notifications\AttendanceRecordedNotification;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class AttendanceRecordedListener implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(AttendanceRecorded $event): void
    {
        TeamCache::flushTeam($event->team->id);

        $playerIds = collect($event->records)->pluck('player_id');

        $userIds = Player::whereIn('id', $playerIds)
            ->whereNotNull('user_id')
            ->pluck('user_id');

        User::whereIn('id', $userIds)->get()->each(function (User $user) use ($event) {
            $user->notify(new AttendanceRecordedNotification($event->team));
        });
    }
}
