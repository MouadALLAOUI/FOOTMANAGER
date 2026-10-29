<?php

namespace App\Console\Commands;

use App\Domains\Team\Services\TeamStatisticsSyncService;
use Illuminate\Console\Command;

class SyncTeamStatisticsCommand extends Command
{
    protected $signature = 'teams:sync-stats';

    protected $description = 'Recalculate all-time statistics (matches, wins, draws, losses, points) for all teams across all tournaments and friendly matches';

    public function handle(TeamStatisticsSyncService $syncService): int
    {
        $this->info('Starting team statistics synchronization across all tournaments and matches...');

        $count = $syncService->syncAll();

        $this->info("Successfully synchronized statistics for {$count} teams.");

        return self::SUCCESS;
    }
}
