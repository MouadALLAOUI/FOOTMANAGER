<?php

namespace App\Console\Commands;

use App\Domains\Team\Services\TeamAnnouncementService;
use Illuminate\Console\Command;

class ProcessScheduledAnnouncements extends Command
{
    protected $signature = 'team:process-scheduled-announcements';

    protected $description = 'Publishes team announcements whose scheduled time has arrived';

    public function handle(TeamAnnouncementService $service): int
    {
        $published = $service->publishDue();

        $this->info("Published {$published} scheduled announcement(s).");

        return self::SUCCESS;
    }
}
