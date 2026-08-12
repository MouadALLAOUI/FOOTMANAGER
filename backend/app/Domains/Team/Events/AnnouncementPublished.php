<?php

namespace App\Domains\Team\Events;

use App\Domains\Team\Models\TeamAnnouncement;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AnnouncementPublished
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public TeamAnnouncement $announcement,
    ) {}
}
