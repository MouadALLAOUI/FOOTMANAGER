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
        return TerrainBooking::query()->where('fixture_id', $fixture->id)->first()
            ?? ($fixture->match?->active_reservation_id ? TerrainBooking::find($fixture->match->active_reservation_id) : null);
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
        $duration = (int) ($fixture->match?->match_duration_minutes ?? $tournament->match_duration_minutes ?? 60);

        // Never overwrite a weekly subscription! If the fixture was pointing to a weekly subscription,
        // keep that subscription intact and manage occurrence / separate reservation.
        $existing = null;
        if ($fixture->match?->active_reservation_id) {
            $candidate = TerrainBooking::find($fixture->match->active_reservation_id);
            if ($candidate && ! $candidate->isWeeklySubscription()) {
                $existing = $candidate;
            } elseif ($candidate && $candidate->isWeeklySubscription()) {
                // Ensure occurrence is tracked for this weekly booking and fixture
                \App\Domains\Booking\Models\TerrainBookingOccurrence::updateOrCreate(
                    [
                        'terrain_booking_id' => $candidate->id,
                        'occurrence_date' => $scheduledAt->toDateString(),
                    ],
                    [
                        'stadium_id' => $fixture->stadium_id,
                        'start_time' => $scheduledAt->format('H:i'),
                        'end_time' => $scheduledAt->copy()->addMinutes($duration)->format('H:i'),
                        'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_USED_BY_MATCH,
                        'fixture_id' => $fixture->id,
                        'notes' => 'مباراة بطولة: '.$tournament->name,
                    ]
                );
            }
        }

        $booking = TerrainBooking::query()->where('fixture_id', $fixture->id)->where('reservation_type', 'single')->first()
            ?? $existing
            ?? new TerrainBooking(['fixture_id' => $fixture->id]);

        $booking->fixture_id = $fixture->id;

        $stadium = $fixture->stadium ?: \App\Domains\Stadium\Models\Stadium::find($fixture->stadium_id);
        $isOrganizerOwner = $stadium && ((int) $stadium->owner_id === (int) $tournament->organizer_id);
        $bookingStatus = ($isOrganizerOwner || $tournament->is_terrain_managed) ? 'approved' : 'pending';

        $booking->fill([
            'terrain_id' => $fixture->stadium_id,
            'manager_id' => $tournament->organizer_id,
            'team_id' => $fixture->home_team_id ?: $fixture->away_team_id,
            'booking_type' => 'match',
            'flow_type' => 'amical',
            'reservation_type' => 'single',
            'booking_date' => $scheduledAt->toDateString(),
            'start_time' => $scheduledAt->format('H:i'),
            'end_time' => $scheduledAt->copy()->addMinutes($duration)->format('H:i'),
            'price' => 0,
            'subtotal' => 0,
            'service_fee' => 0,
            'total' => 0,
            'payment_required' => false,
            'payment_status' => 'paid',
            'status' => $bookingStatus,
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

        $affectedTerrainIds = TerrainBooking::query()
            ->whereIn('fixture_id', $ids->all())
            ->pluck('terrain_id')
            ->unique()
            ->all();

        // 1. Release single bookings back to available pool
        $count = TerrainBooking::query()
            ->whereIn('fixture_id', $ids->all())
            ->where(function ($q) {
                $q->whereNull('reservation_type')
                    ->orWhere('reservation_type', '!=', 'weekly_subscription');
            })
            ->update([
                'fixture_id' => null,
                'archived_at' => now(),
                'status' => 'cancelled',
            ]);

        // 2. If any weekly subscription had fixture_id linked, safely detach without archiving
        TerrainBooking::query()
            ->whereIn('fixture_id', $ids->all())
            ->where('reservation_type', 'weekly_subscription')
            ->update(['fixture_id' => null]);

        // 3. Mark occurrences linked to these fixtures as freed
        \App\Domains\Booking\Models\TerrainBookingOccurrence::query()
            ->whereIn('fixture_id', $ids->all())
            ->where('status', \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_USED_BY_MATCH)
            ->update([
                'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_FREED,
                'fixture_id' => null,
            ]);

        // 4. Invalidate availability cache for affected terrains
        foreach ($affectedTerrainIds as $tid) {
            \App\Domains\Booking\Services\SlotAvailabilityService::invalidate((int) $tid);
        }

        // 5. Detach the owning match from the released reservation
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