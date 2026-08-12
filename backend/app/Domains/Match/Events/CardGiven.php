<?php

namespace App\Domains\Match\Events;

use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchEvent;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CardGiven
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public FootballMatch $match,
        public MatchEvent $event,
    ) {}
}
