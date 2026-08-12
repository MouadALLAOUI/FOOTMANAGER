<?php

namespace App\Domains\Match\Listeners;

use App\Domains\Match\Events\SubstitutionMade;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SubstitutionMadeListener implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(SubstitutionMade $event): void
    {
        if (! $event->event->player_id) {
            return;
        }

        $performance = $event->match->performances()
            ->where('player_id', $event->event->player_id)
            ->first();

        if (! $performance) {
            return;
        }

        $performance->minutes_played = max($performance->minutes_played, (int) $event->event->minute);
        $performance->save();
    }
}
