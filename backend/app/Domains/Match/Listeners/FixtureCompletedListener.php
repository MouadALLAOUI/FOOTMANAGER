<?php

namespace App\Domains\Match\Listeners;

use App\Domains\Match\Events\FixtureCompleted;
use App\Domains\Shared\Support\TeamCache;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class FixtureCompletedListener implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(FixtureCompleted $event): void
    {
        if ($event->match->host_team_id) {
            TeamCache::flushTeam((int) $event->match->host_team_id);
        }

        if ($event->match->opponent_team_id) {
            TeamCache::flushTeam((int) $event->match->opponent_team_id);
        }
    }
}
