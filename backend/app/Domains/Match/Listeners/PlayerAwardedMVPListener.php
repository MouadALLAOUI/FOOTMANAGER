<?php

namespace App\Domains\Match\Listeners;

use App\Domains\Match\Events\PlayerAwardedMVP;
use App\Domains\Shared\Support\PlayerCache;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class PlayerAwardedMVPListener implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(PlayerAwardedMVP $event): void
    {
        $player = $event->performance->player;

        if (! $player) {
            return;
        }

        PlayerCache::flush((int) $event->performance->team_id);
        PlayerCache::flush((int) $event->performance->player_id);

        if ($player->user_id) {
            PlayerCache::flush((int) $player->user_id);
        }
    }
}
