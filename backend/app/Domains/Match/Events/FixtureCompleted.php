<?php

namespace App\Domains\Match\Events;

use App\Domains\Match\Models\MatchRequest;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FixtureCompleted
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public MatchRequest $match,
    ) {}
}
