<?php

namespace App\Domains\Match\Listeners;

use App\Domains\Match\Enums\MatchEventType;
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

        $column = $event->event->type === MatchEventType::RedCard ? 'red_cards' : 'yellow_cards';

        $event->match->performances()
            ->where('player_id', $event->event->player_id)
            ->increment($column);
    }
}
