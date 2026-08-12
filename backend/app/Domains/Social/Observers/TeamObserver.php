<?php

namespace App\Domains\Social\Observers;

use App\Domains\Social\Models\Activity;
use App\Domains\Social\Services\ActivityService;
use App\Domains\Team\Models\Team;
use App\Models\User;

class TeamObserver
{
    public function __construct(protected ActivityService $activity) {}

    public function created(Team $team): void
    {
        $this->activity->record(
            Activity::TYPE_TEAM_CREATED,
            User::find($team->manager_id),
            $team,
            ['name' => $team->name],
            $team->logo_url,
        );
    }
}
