<?php

namespace App\Domains\Social\Listeners;

use App\Domains\Notification\Services\NotificationService;
use App\Domains\Player\Models\Player;
use App\Domains\Social\Events\UserFollowed;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use Illuminate\Contracts\Queue\ShouldQueue;

class UserFollowedListener implements ShouldQueue
{
    public function __construct(
        protected NotificationService $notifications,
    ) {}

    public function handle(UserFollowed $event): void
    {
        $target = $event->follow->followable;

        if (! $target) {
            return;
        }

        $ownerId = match (true) {
            $target instanceof Team => $target->manager_id,
            $target instanceof Player => $target->user_id,
            $target instanceof Stadium => $target->owner_id,
            default => null,
        };

        if (! $ownerId || (int) $ownerId === (int) $event->follow->follower_id) {
            return;
        }

        $this->notifications->notify(
            (int) $ownerId,
            'new_follower',
            'متابع جديد',
            $event->follow->follower?->name.' بدأ بمتابعة '.($target->name ?? 'حسابك').'.',
            ['follow_id' => $event->follow->id],
        );
    }
}
