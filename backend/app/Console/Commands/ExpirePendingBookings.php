<?php

namespace App\Console\Commands;

use App\Domains\Booking\Models\TerrainBooking;
use Illuminate\Console\Command;

class ExpirePendingBookings extends Command
{
    protected $signature = 'bookings:expire-pending';

    protected $description = 'Expire pending bookings whose reservation window has passed';

    public function handle(): int
    {
        $count = TerrainBooking::where('status', 'pending')
            ->where(function ($query) {
                $query->where('expires_at', '<', now())
                    ->orWhereDate('booking_date', '<', now()->toDateString());
            })
            ->update(['status' => 'expired']);

        $this->info("Expired {$count} pending booking(s).");

        return self::SUCCESS;
    }
}
