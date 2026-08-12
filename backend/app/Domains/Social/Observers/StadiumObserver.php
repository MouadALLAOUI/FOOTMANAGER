<?php

namespace App\Domains\Social\Observers;

use App\Domains\Social\Models\Activity;
use App\Domains\Social\Services\ActivityService;
use App\Domains\Stadium\Models\Stadium;
use App\Models\User;

class StadiumObserver
{
    public function __construct(protected ActivityService $activity) {}

    public function created(Stadium $stadium): void
    {
        $this->activity->record(
            Activity::TYPE_STADIUM_CREATED,
            User::find($stadium->owner_id),
            $stadium,
            ['name' => $stadium->name, 'city' => $stadium->city],
            $stadium->cover_image_url,
        );
    }
}
