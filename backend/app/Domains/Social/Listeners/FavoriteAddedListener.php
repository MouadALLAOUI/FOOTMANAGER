<?php

namespace App\Domains\Social\Listeners;

use App\Domains\Shared\Support\SocialCache;
use App\Domains\Social\Events\FavoriteAdded;
use Illuminate\Contracts\Queue\ShouldQueue;

class FavoriteAddedListener implements ShouldQueue
{
    public function handle(FavoriteAdded $event): void
    {
        $favorite = $event->favorite;

        if ($favorite->favoritable) {
            SocialCache::flush($favorite->favoritable_type, (int) $favorite->favoritable_id);
        }
    }
}
