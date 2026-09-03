<?php

namespace App\Domains\Match\Listeners;

use App\Domains\Match\Enums\MatchEventType;
use App\Domains\Match\Enums\MatchPunishment;
use App\Domains\Match\Events\CardGiven;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class CardGivenListener implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(CardGiven $event): void
    {
        if (! $event->event->player_id) {
            return;
        }

        // Cards are modelled as a `foul` event with a punishment. Dismissals
        // (second yellow / red) count as a red card; others as a yellow.
        $dismissal = $event->event->type === MatchEventType::RedCard
            || $event->event->punishment?->isDismissal() === true
            || $event->event->punishment === MatchPunishment::Red;

        $column = $dismissal ? 'red_cards' : 'yellow_cards';

        $event->match->performances()
            ->where('player_id', $event->event->player_id)
            ->increment($column);
    }
}
