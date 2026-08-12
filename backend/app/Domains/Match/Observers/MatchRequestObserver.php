<?php

namespace App\Domains\Match\Observers;

use App\Domains\Match\Events\FixtureCancelled;
use App\Domains\Match\Events\FixtureCompleted;
use App\Domains\Match\Events\FixtureCreated;
use App\Domains\Match\Models\MatchRequest;

class MatchRequestObserver
{
    public function updated(MatchRequest $match): void
    {
        if (! $match->wasChanged('status')) {
            return;
        }

        $newStatus = $match->status;

        if ($newStatus === 'accepted') {
            event(new FixtureCreated($match));
        }

        if ($newStatus === 'completed') {
            event(new FixtureCompleted($match));
        }

        if ($newStatus === 'cancelled') {
            event(new FixtureCancelled($match));
        }
    }
}
