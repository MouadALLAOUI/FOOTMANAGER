<?php

namespace App\Domains\Team\Events;

use App\Domains\Player\Models\Player;
use App\Domains\Team\Models\Team;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CaptainAssigned
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Team $team,
        public Player $player,
        public bool $isVice = false,
    ) {}
}
