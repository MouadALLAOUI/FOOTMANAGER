<?php

namespace App\Domains\Social\Events;

use App\Domains\Social\Models\Activity;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ActivityCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(public Activity $activity) {}
}
