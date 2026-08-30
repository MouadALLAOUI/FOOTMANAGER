<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Tournament\Models\Tournament;
use Illuminate\Support\Str;

/**
 * Keeps terrain reservations in sync with tournament fixtures.
 *
 * Every scheduled tournament match (stadium + datetime on the fixture) owns one
 * real active reservation (status 'approved') so it shows on the terrain
 * owner's calendar and blocks normal booking requests via SlotAvailabilityService.
 *
 * When a tournament finishes (or its schedule/fixture is cancelled, postponed,
 * regenerated) the linked reservations are archived (archived_at set), which
 * releases the slot everywhere while the rows are kept as logs.
 */
class TournamentTerrainBookingService
{
    public function bookingFor(Fixture $fixture): ?TerrainBooking
    {
        return TerrainBooking::query()->where('fixture_id', $fixture->id)->first();
    }

    /**
     * Create (or refresh) the active reservation for a fixture. Idempotent:
     * keyed on fixture_id, so regeneration/reschedule never duplicate rows.
     */
    public function createForFixture(Tournament $tournament, Fixture $fixture): ?TerrainBooking
    {
        if ($tournament->isCompleted() || $tournament->isCancelled()) {
            return null;
        }

        if (! $fixture->stadium_id || ! $fixture->scheduled_at) {
            return null;
        }

        $scheduledAt = $fixture->scheduled_at;

        $booking = TerrainBooking::query()->firstOrNew(['fixture_id' => $fixture->id]);

        $booking->fill([
            'terrain_id' => $fixture->stadium_id,
            'manager_id' => $tournament->organizer_id,
            'team_id' => $fixture->home_team_id ?: $fixture->away_team_id,
            'booking_type' => 'match',
            'flow_type' => 'amical',
            'reservation_type' => 'single',
            'booking_date' => $scheduledAt->toDateString(),
            'start_time' => $scheduledAt->format('H:i'),
            'end_time' => $scheduledAt->copy()->addHours(2)->format('H:i'),
            'price' => 0,
            'subtotal' => 0,
            'service_fee' => 0,
            'total' => 0,
            'payment_required' => false,
            'payment_status' => 'paid',
            'status' => 'approved',
            'notes' => 'مباراة بطولة: '.$tournament->name,
            'archived_at' => null,
        ]);

        if (! $booking->exists) {
            $booking->booking_reference = TerrainBooking::generateReference();
            $booking->uuid = (string) Str::uuid();
        }

        $booking->save();

        // Keep the owning match's reservation pointer + confirm flag in sync so
        // the resource and the reservation flow agree on what is active.
        if ($fixture->match) {
            $fixture->match->forceFill([
                'active_reservation_id' => $booking->id,
                'is_confirmed' => true,
            ])->save();
        }

        return $booking;
    }

    /**
     * Sync a fixture's reservation: refresh it when the fixture has a slot,
     * otherwise release (archive) the existing one.
     */
    public function syncFixture(Tournament $tournament, Fixture $fixture): ?TerrainBooking
    {
        if (! $fixture->stadium_id || ! $fixture->scheduled_at) {
            $this->archiveForFixture($fixture);

            return null;
        }

        return $this->createForFixture($tournament, $fixture);
    }

    /**
     * Re-activate a fixture's reservation (kept as a log when cleared).
     */
    public function restoreFixture(Fixture $fixture): int
    {
        return TerrainBooking::query()
            ->where('fixture_id', $fixture->id)
            ->update(['archived_at' => null]);
    }

    public function archiveForFixture(Fixture $fixture): int
    {
        return $this->archiveForFixtures([$fixture->id]);
    }

    /**
     * @param  iterable<int>  $fixtureIds
     */
    public function archiveForFixtures(iterable $fixtureIds): int
    {
        $ids = collect($fixtureIds)->filter()->unique()->values();

        if ($ids->isEmpty()) {
            return 0;
        }

        $count = TerrainBooking::query()
            ->whereIn('fixture_id', $ids->all())
            ->whereNull('archived_at')
            ->update(['archived_at' => now()]);

        // Detach the owning match from the released reservation so the resource
        // advertises the slot as no longer actively claimed.
        FootballMatch::query()
            ->whereIn('id', Fixture::query()->whereIn('id', $ids->all())->pluck('match_id')->filter()->all())
            ->update(['active_reservation_id' => null]);

        return $count;
    }

    /**
     * Release every reservation belonging to a tournament (kept as logs).
     */
    public function archiveForTournament(Tournament $tournament): int
    {
        return $this->archiveForFixtures($this->fixtureIdsFor($tournament));
    }

    /**
     * Hard-delete every reservation belonging to a tournament (full teardown).
     */
    public function deleteForTournament(Tournament $tournament): int
    {
        $fixtureIds = $this->fixtureIdsFor($tournament);

        if ($fixtureIds->isEmpty()) {
            return 0;
        }

        return TerrainBooking::query()
            ->whereIn('fixture_id', $fixtureIds->all())
            ->delete();
    }

    private function fixtureIdsFor(Tournament $tournament): \Illuminate\Support\Collection
    {
        if (! $tournament->competition_id || ! $tournament->season_id) {
            return collect();
        }

        return Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->pluck('id');
    }
}