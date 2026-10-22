<?php

namespace App\Console\Commands;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Booking\Models\TerrainBookingOccurrence;
use App\Domains\Booking\Services\SlotAvailabilityService;
use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Stadium\Models\Stadium;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RepairBookingsIntegrityCommand extends Command
{
    protected $signature = 'bookings:repair-integrity
                            {--dry-run : Default read-only analysis mode}
                            {--apply : Apply fixes after explicit confirmation}';

    protected $description = 'Analyze and safely repair weekly subscriptions damaged by postponements and clear ghost slot blocks';

    public function handle(SlotAvailabilityService $availabilityService): int
    {
        $apply = (bool) $this->option('apply');
        $dryRun = ! $apply;

        $this->info('=====================================================');
        $this->info('  FOOTBALL PLATFORM — SLOTS & AVAILABILITY INTEGRITY');
        $this->info('  Mode: ' . ($dryRun ? 'READ-ONLY (Dry Run)' : 'APPLY (Write Mode)'));
        $this->info('=====================================================');

        // ---------------------------------------------------------------------
        // REPORT (i): Weekly bookings damaged or cancelled by match postponements
        // ---------------------------------------------------------------------
        $this->newLine();
        $this->info('--- [Report 1] Weekly Subscriptions Affected by Postponements ---');

        // Look for weekly subscriptions with archived_at set, or single bookings that have day_of_week set and archived_at
        $damagedSubscriptions = TerrainBooking::query()
            ->where(function ($q) {
                $q->where(function ($sq) {
                    $sq->where('reservation_type', 'weekly_subscription')
                        ->whereNotNull('archived_at');
                })->orWhere(function ($sq) {
                    $sq->where('reservation_type', 'single')
                        ->whereNotNull('day_of_week')
                        ->whereNotNull('archived_at');
                });
            })
            ->with(['terrain', 'team', 'fixture.match', 'fixture.homeTeam', 'fixture.awayTeam'])
            ->get();

        // Also check fixtures that are postponed whose previous reservation was a weekly subscription
        $postponedFixtures = Fixture::query()
            ->where('status', FixtureStatus::Postponed)
            ->with(['homeTeam', 'awayTeam', 'stadium'])
            ->get();

        $rows1 = [];
        foreach ($damagedSubscriptions as $b) {
            $relatedFixture = $b->fixture;
            if (! $relatedFixture && $b->notes) {
                preg_match('/fixture[:\s#]+(\d+)/i', $b->notes, $matches);
                if (! empty($matches[1])) {
                    $relatedFixture = Fixture::find($matches[1]);
                }
            }

            $fixtureInfo = $relatedFixture
                ? "Fixture #{$relatedFixture->id}: " . ($relatedFixture->homeTeam?->name ?? 'مضيف') . ' ضد ' . ($relatedFixture->awayTeam?->name ?? 'ضيف')
                : 'N/A';

            $rows1[] = [
                'ID' => $b->id,
                'Stadium' => $b->terrain?->name ?? "Stadium #{$b->terrain_id}",
                'Team' => $b->team?->name ?? "Team #{$b->team_id}",
                'Type' => $b->reservation_type,
                'DOW' => $b->day_of_week,
                'Time' => "{$b->start_time} - {$b->end_time}",
                'Archived At' => $b->archived_at?->toDateTimeString() ?? 'NULL',
                'Postponed Fixture' => $fixtureInfo,
            ];
        }

        if (empty($rows1)) {
            $this->line('  ✓ No damaged weekly subscriptions found.');
        } else {
            $this->table(['Booking ID', 'Stadium', 'Team', 'Type', 'DOW', 'Time', 'Archived At', 'Postponed Fixture'], $rows1);
            $this->warn('  Found ' . count($rows1) . ' damaged subscription(s).');
        }

        // ---------------------------------------------------------------------
        // REPORT (ii): Ghost Blocks (Blocked in form but free in calendar, or vice-versa)
        // ---------------------------------------------------------------------
        $this->newLine();
        $this->info('--- [Report 2] Ghost Blocks & Form/Calendar Inconsistencies ---');

        $stadiums = Stadium::where('is_open', true)->get();
        $ghostBlocks = [];
        $today = Carbon::today();

        // Scan upcoming 30 days for each stadium
        for ($offset = 0; $offset < 30; $offset++) {
            $date = $today->copy()->addDays($offset)->toDateString();

            foreach ($stadiums as $stadium) {
                // Compute detailed slots using the unified service
                $detailed = $availabilityService->getDetailedSlotsForDate($stadium, $date);
                $slots = $detailed['slots'] ?? [];

                // Compare with any archived bookings that would have blocked previously
                $archivedConflicts = TerrainBooking::query()
                    ->where('terrain_id', $stadium->id)
                    ->where('booking_date', $date)
                    ->whereNotNull('archived_at')
                    ->whereIn('status', SlotAvailabilityService::CONFLICT_STATUSES)
                    ->get();

                foreach ($archivedConflicts as $ab) {
                    $ghostBlocks[] = [
                        'Stadium' => $stadium->name,
                        'Date' => $date,
                        'Slot' => "{$ab->start_time} - {$ab->end_time}",
                        'Booking ID' => $ab->id,
                        'Status' => $ab->status,
                        'Team' => $ab->team?->name ?? $ab->guest_name ?? 'N/A',
                        'Ghost Reason' => 'Archived booking had no whereNull(archived_at) in legacy form queries',
                    ];
                }
            }
        }

        if (empty($ghostBlocks)) {
            $this->line('  ✓ No ghost blocks or slot discrepancies detected.');
        } else {
            $this->table(['Stadium', 'Date', 'Slot', 'Booking ID', 'Status', 'Team', 'Ghost Reason'], array_slice($ghostBlocks, 0, 50));
            if (count($ghostBlocks) > 50) {
                $this->line('  ... and ' . (count($ghostBlocks) - 50) . ' more ghost block(s).');
            }
            $this->warn('  Found ' . count($ghostBlocks) . ' ghost block occurrence(s).');
        }

        // ---------------------------------------------------------------------
        // REPAIR EXECUTION (ONLY WHEN --apply is passed)
        // ---------------------------------------------------------------------
        if ($dryRun) {
            $this->newLine();
            $this->info('Dry-run complete. Nothing was modified.');
            $this->line('To apply repairs, run: php artisan bookings:repair-integrity --apply');
            return 0;
        }

        // Write mode: require explicit DB backup confirmation
        $this->newLine();
        $this->alert('CAUTION: You are about to apply integrity repairs.');
        $confirmedBackup = $this->confirm('Have you created a full database backup before proceeding?', false);

        if (! $confirmedBackup) {
            $this->error('Operation cancelled: Please backup your database before applying fixes.');
            return 1;
        }

        $this->info('Applying repairs inside database transaction...');

        DB::transaction(function () use ($damagedSubscriptions, $availabilityService) {
            $restoredCount = 0;

            foreach ($damagedSubscriptions as $sub) {
                // Restore weekly subscription attributes
                $sub->forceFill([
                    'reservation_type' => 'weekly_subscription',
                    'archived_at' => null,
                    'fixture_id' => null,
                ])->save();

                // If a fixture postponement caused this, record occurrence as freed
                if ($sub->booking_date) {
                    TerrainBookingOccurrence::updateOrCreate(
                        [
                            'terrain_booking_id' => $sub->id,
                            'occurrence_date' => $sub->booking_date->toDateString(),
                        ],
                        [
                            'stadium_id' => $sub->terrain_id,
                            'start_time' => $sub->start_time,
                            'end_time' => $sub->end_time,
                            'status' => TerrainBookingOccurrence::STATUS_FREED,
                            'notes' => 'Restored by repair command from postponement damage',
                        ]
                    );
                }

                SlotAvailabilityService::invalidate((int) $sub->terrain_id);
                $restoredCount++;
            }

            $this->info("Successfully restored {$restoredCount} weekly subscription(s).");
        });

        $this->info('Repairs applied successfully!');
        return 0;
    }
}
