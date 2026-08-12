<?php

namespace App\Domains\Match\Events;

use App\Domains\Match\Models\FootballMatch;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MatchFinished
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public FootballMatch $match,
        public int $byUserId,
    ) {}
}
