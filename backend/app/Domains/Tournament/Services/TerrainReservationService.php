<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Services\MatchMembershipService;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Orchestrates terrain reservation for tournament fixtures, coupling the
 * schedule (fixture/match) with its active terrain booking so that editing a
 * match's date/time/pitch never leaves an orphaned reservation and never
 * double-books a Terrain Owner's calendar.
 *
 * Two modes:
 *   INDEPENDENT  - reservations are auto-claimed immediately when a fixture is
 *                  scheduled (legacy behaviour). is_confirmed is always treated
 *                  as true; there is no draft gate.
 *   INTEGRATED   - scheduling edits save a *draft*: the fixture slot is
 *                  persisted and any previously held reservation is released so
 *                  the slot does not block the owner calendar. Only an explicit
 *                  confirm re-validates the slot and atomically claims it.
 *
 * The booking row is stored on terrain_bookings keyed by unique fixture_id
 * (status 'approved' = active, archived_at = released), so a match can never
 * own more than one reservation and released rows are kept as audit logs.
 */
class TerrainReservationService
{
    public const OUTCOME_DRAFT = 'draft';

    public const OUTCOME_CONFIRMED = 'confirmed';

    public const OUTCOME_RELEASED = 'released';

    public function __construct(
        private readonly TournamentTerrainBookingService $bookings,
        private readonly TournamentFixtureService $fixtures,
    ) {}

    public function isIntegrated(Tournament $tournament): bool
    {
        return $tournament->usesIntegratedTerrainReservations();
    }

    public function bookingFor(Fixture $fixture): ?TerrainBooking
    {
        return $this->bookings->bookingFor($fixture);
    }

    /**
     * Save a schedule change for a non-finished fixture.
     *
     * INDEPENDENT: writes the slot and immediately (re)claims the active
     * reservation, keeps the match confirmed.
     *
     * INTEGRATED:  writes the slot as a DRAFT, marks the match unconfirmed and
     * releases any held reservation so the new slot neither orphans the old one
     * nor blocks the owner calendar until the committee confirms.
     *
     * @return array{fixture: Fixture, outcome: string, message: string}
     */
    public function saveSchedule(
        Tournament $tournament,
        Fixture $fixture,
        Carbon $scheduledAt,
        ?int $stadiumId,
    ): array {
        return DB::transaction(function () use ($tournament, $fixture, $scheduledAt, $stadiumId) {
            $resolvedStadiumId = $stadiumId ?? $fixture->stadium_id;

            $this->assertNotFinished($fixture);

            $fixture->forceFill([
                'scheduled_at' => $scheduledAt,
                'stadium_id' => $resolvedStadiumId,
                'status' => FixtureStatus::Scheduled,
            ])->save();

            if ($this->isIntegrated($tournament)) {
                // Release any reservation the old slot held so it is not orphaned
                // and frees the owner calendar until this draft is confirmed.
                $this->bookings->archiveForFixture($fixture);

                if ($fixture->match) {
                    $fixture->match->forceFill(['is_confirmed' => false])->save();
                }

                return [
                    'fixture' => $fixture,
                    'outcome' => self::OUTCOME_DRAFT,
                    'message' => 'تم حفظ التعديل كمسودة — أكّد الحجز لإشغال الملعب',
                ];
            }

            if ($fixture->match) {
                $fixture->match->forceFill([
                    'status' => MatchStatus::Scheduled,
                    'is_confirmed' => true,
                ])->save();
            }

            $booking = $this->bookings->syncFixture($tournament, $fixture);

            if ($fixture->match && $booking) {
                $fixture->match->forceFill(['active_reservation_id' => $booking->id])->save();
            }

            return [
                'fixture' => $fixture,
                'outcome' => self::OUTCOME_CONFIRMED,
                'message' => 'تمت إعادة جدولة المباراة',
            ];
        });
    }

    /**
     * Atomically claim a confirmed reservation for a draft slot in INTEGRATED
     * mode. Re-validates the slot against every authoritative source (terrain
     * booking conflicts + other tournament fixtures + team schedule conflicts,
     * excluding this match's own state) before claiming, so a Terrain Owner's
     * calendar is never double-booked and a conflicting slot never partially
     * commits.
     */
    public function confirm(Fixture $fixture): array
    {
        return DB::transaction(function () use ($fixture) {
            $this->assertNotFinished($fixture);

            if (! $fixture->stadium_id || ! $fixture->scheduled_at) {
                throw new DomainException('لا يمكن تأكيد الحجز قبل تحديد موعد وملعب المباراة');
            }

            $fixture->loadMissing(['match', 'homeTeam', 'awayTeam']);

            $datetime = $fixture->scheduled_at;
            $time = $datetime->format('H:i');
            $endTime = $datetime->copy()->addHours(2)->format('H:i');

            // Exclude this match's own active reservation from the conflict check
            // so it never counts against itself, and so re-confirming is idempotent.
            $excludeBookingId = $this->bookingFor($fixture)?->id;

            $this->fixtures->assertStadiumsValid([$fixture->stadium_id]);

            if ($this->fixtures->stadiumHasFixtureConflict($fixture->stadium_id, $datetime, $fixture->match_id)) {
                throw new DomainException('هذا التوقيت محجوز لمباراة بطولة أخرى في هذا الملعب');
            }

            if (TerrainBooking::getConflictMessage(
                $fixture->stadium_id,
                $datetime->toDateString(),
                $time,
                $endTime,
                excludeId: $excludeBookingId,
            )) {
                throw new DomainException('هذا التوقيت محجوز في الملعب المحدد — عدّل الموعد ثم أعد التأكيد');
            }

            $homeTeamId = (int) ($fixture->home_team_id ?? 0);
            $awayTeamId = (int) ($fixture->away_team_id ?? 0);

            if ($homeTeamId > 0 && MatchMembershipService::teamHasMatchConflict($homeTeamId, $datetime, $fixture->match_id)) {
                throw new DomainException('الفريق المضيف لديه مباراة أخرى في هذا التوقيت');
            }

            if ($awayTeamId > 0 && MatchMembershipService::teamHasMatchConflict($awayTeamId, $datetime, $fixture->match_id)) {
                throw new DomainException('الفريق الضيف لديه مباراة أخرى في هذا التوقيت');
            }

            // Claim the slot for the fixture's current schedule (idempotent,
            // keyed by unique fixture_id).
            $booking = $this->bookings->createForFixture($this->tournamentFor($fixture), $fixture);

            if ($fixture->match) {
                $fixture->match->forceFill([
                    'is_confirmed' => true,
                    'active_reservation_id' => $booking?->id,
                    'status' => MatchStatus::Scheduled,
                ])->save();
            }

            return [
                'fixture' => $fixture,
                'booking' => $booking,
                'outcome' => self::OUTCOME_CONFIRMED,
                'message' => 'تم تأكيد الحجز وإشغال الملعب',
            ];
        });
    }

    /**
     * Release a fixture's reservation and mark its match unconfirmed (used when
     * a transition to INDEPENDENT mode frees all slots, and on teardown).
     */
    public function release(Fixture $fixture): int
    {
        $released = $this->bookings->archiveForFixture($fixture);

        if ($fixture->match) {
            $fixture->match->forceFill([
                'is_confirmed' => false,
                'active_reservation_id' => null,
            ])->save();
        }

        return $released;
    }

    /**
     * Change the reservation mode for a tournament.
     *
     * Switching to INDEPENDENT releases every active reservation and marks
     * matches unconfirmed so no slot is silently orphaned: reservations no
     * longer track separate confirm state and each subsequent schedule edit
     * auto-claims. Switching to INTEGRATED keeps existing reservations as-is.
     *
     * @return int number of released reservations
     */
    public function setMode(Tournament $tournament, string $mode): int
    {
        $previous = $tournament->terrain_reservation_mode ?: Tournament::TERRAIN_RESERVATION_INDEPENDENT;

        $tournament->forceFill(['terrain_reservation_mode' => $mode])->save();

        if ($previous === Tournament::TERRAIN_RESERVATION_INTEGRATED
            && $mode === Tournament::TERRAIN_RESERVATION_INDEPENDENT) {
            $released = $this->bookings->archiveForTournament($tournament);

            foreach ($this->tournamentMatches($tournament) as $match) {
                $match->forceFill([
                    'is_confirmed' => false,
                    'active_reservation_id' => null,
                ])->save();
            }

            return $released;
        }

        return 0;
    }

    private function assertNotFinished(Fixture $fixture): void
    {
        if ($fixture->match?->status === MatchStatus::Finished) {
            throw new DomainException('لا يمكن تعديل مباراة انتهت');
        }
    }

    private function tournamentFor(Fixture $fixture): Tournament
    {
        $teamId = $fixture->home_team_id ?: $fixture->away_team_id;

        $tournament = Tournament::query()
            ->where('competition_id', $fixture->competition_id)
            ->where('season_id', $fixture->season_id)
            ->first();

        if (! $tournament) {
            throw new DomainException('لم يتم العثور على البطولة المرتبطة بالمباراة');
        }

        return $tournament;
    }

    /**
     * @return \Illuminate\Support\Collection<int, FootballMatch>
     */
    private function tournamentMatches(Tournament $tournament): \Illuminate\Support\Collection
    {
        if (! $tournament->competition_id || ! $tournament->season_id) {
            return collect();
        }

        return FootballMatch::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->get();
    }
}
