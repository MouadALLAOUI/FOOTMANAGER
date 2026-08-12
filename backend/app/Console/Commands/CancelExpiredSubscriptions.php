<?php

namespace App\Console\Commands;

use App\Domains\Booking\Models\TerrainBooking;
use Illuminate\Console\Command;

class CancelExpiredSubscriptions extends Command
{
    protected $signature = 'subscriptions:cancel-expired';

    protected $description = 'Auto-complete weekly subscriptions that have passed their end date';

    public function handle(): int
    {
        $expired = TerrainBooking::where('reservation_type', 'weekly_subscription')
            ->where('status', 'approved')
            ->where('end_date', '<', now()->toDateString())
            ->update(['status' => 'completed']);

        $this->info("Completed {$expired} expired subscription(s).");

        return Command::SUCCESS;
    }
}
