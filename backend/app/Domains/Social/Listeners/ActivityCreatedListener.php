<?php

namespace App\Domains\Social\Listeners;

use App\Domains\Shared\Support\SocialCache;
use App\Domains\Social\Events\ActivityCreated;
use Illuminate\Contracts\Queue\ShouldQueue;

class ActivityCreatedListener implements ShouldQueue
{
    public function handle(ActivityCreated $event): void
    {
        SocialCache::flushFeed();
    }
}
