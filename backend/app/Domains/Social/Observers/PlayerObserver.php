<?php

namespace App\Domains\Social\Observers;

use App\Domains\Player\Models\Player;
use App\Domains\Social\Models\Activity;
use App\Domains\Social\Services\ActivityService;

class PlayerObserver
{
    public function __construct(protected ActivityService $activity) {}

    public function created(Player $player): void
    {
        $this->activity->record(
            Activity::TYPE_PLAYER_JOINED,
            $player->user,
            $player->team,
            ['name' => $player->name, 'team_id' => $player->team_id],
        );
    }
}
