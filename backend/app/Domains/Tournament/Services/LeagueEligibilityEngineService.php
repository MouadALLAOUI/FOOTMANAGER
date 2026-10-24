<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchResultAudit;
use App\Domains\Notification\Services\NotificationService;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class LeagueEligibilityEngineService
{
    public function __construct(
        private readonly ?TournamentFixtureService $fixtureService = null,
        private readonly ?TournamentTerrainBookingService $bookingService = null,
        private readonly ?LeagueAssignmentService $leagueAssignment = null,
    ) {}

    /**
     * Hard check that fixture and match are not finished, live, or locked.
     */
    public function assertNotLockedOrFinished(Fixture $fixture): void
    {
        if ($fixture->status === FixtureStatus::Played) {
            throw new DomainException('لا يمكن تعديل مباراة ملعوبة ومسجلة نتيجتها بالفعل');
        }

        if ($fixture->match) {
            if ($fixture->match->status === MatchStatus::Finished) {
                throw new DomainException('لا يمكن تعديل مباراة منتهية ومكتملة');
            }
            if (in_array($fixture->match->status, MatchStatus::live(), true)) {
                throw new DomainException('لا يمكن تعديل مباراة جارية مباشرة حالياً');
            }
            if ($fixture->match->home_score > 0 || $fixture->match->away_score > 0) {
                throw new DomainException('لا يمكن تعديل مباراة تم رصد أهداف لها');
            }
        }
    }

    /**
     * Check if a fixture is eligible for modification (boolean without throwing).
     */
    public function isFixtureUnlocked(Fixture $fixture): bool
    {
        if ($fixture->status === FixtureStatus::Played) {
            return false;
        }

        if ($fixture->match) {
            if ($fixture->match->status === MatchStatus::Finished) {
                return false;
            }
            if (in_array($fixture->match->status, MatchStatus::live(), true)) {
                return false;
            }
            if ($fixture->match->home_score > 0 || $fixture->match->away_score > 0) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check rest day rule for a team at a specific date.
     */
    public function satisfiesRestRule(int $teamId, Carbon $targetDate, int $restDaysRequired, Collection $scheduledMatches): bool
    {
        if ($restDaysRequired <= 0) {
            return true;
        }

        $targetDateOnly = Carbon::parse($targetDate->toDateString());

        foreach ($scheduledMatches as $match) {
            if (! $match->scheduled_at) {
                continue;
            }

            if ((int) $match->home_team_id !== $teamId && (int) $match->away_team_id !== $teamId) {
                continue;
            }

            $matchDateOnly = Carbon::parse(Carbon::parse($match->scheduled_at)->toDateString());
            $diffInDays = abs($targetDateOnly->diffInDays($matchDateOnly, false));

            if ($diffInDays <= $restDaysRequired) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check time overlap conflict for a team on date and time window.
     */
    public function hasConflictOnDateTime(int $teamId, Carbon $targetDate, string $startTime, string $endTime, Collection $scheduledMatches): bool
    {
        $targetDateStr = $targetDate->toDateString();
        $targetStart = Carbon::parse($targetDateStr.' '.$startTime);
        $targetEnd = Carbon::parse($targetDateStr.' '.$endTime);

        foreach ($scheduledMatches as $match) {
            if (! $match->scheduled_at) {
                continue;
            }

            if ((int) $match->home_team_id !== $teamId && (int) $match->away_team_id !== $teamId) {
                continue;
            }

            $matchStart = Carbon::parse($match->scheduled_at);
            $duration = (int) ($match->match?->match_duration_minutes ?? 90);
            $matchEnd = $matchStart->copy()->addMinutes($duration);

            if ($targetStart->lt($matchEnd) && $targetEnd->gt($matchStart)) {
                return true;
            }
        }

        return false;
    }

    /* -------------------------------------------------------------------------- */
    /* ACTION 1: REPLACE THE WHOLE MATCH (SWAP SCHEDULE WITH ANOTHER MATCH)       */
    /* -------------------------------------------------------------------------- */

    /**
     * Get eligible matches for swapping schedules with, plus pending/postponed matches.
     *
     * @return array<string, mixed>
     */
    public function getEligibleScheduleSwaps(Tournament $tournament, Fixture $fixture): array
    {
        $this->assertBelongsToTournament($tournament, $fixture);
        $this->assertNotLockedOrFinished($fixture);

        $teamAId = (int) $fixture->home_team_id;
        $teamBId = (int) $fixture->away_team_id;
        $restDaysRequired = (int) ($tournament->rest_days_minimum ?? 1);

        // Pre-fetch all tournament fixtures
        $allFixtures = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('id', '!=', $fixture->id)
            ->with(['homeTeam', 'awayTeam', 'stadium', 'match'])
            ->get();

        $scheduledFixtures = $allFixtures->filter(fn ($f) => $f->scheduled_at && ! in_array($f->status, [FixtureStatus::Cancelled, FixtureStatus::Played], true));

        // 1. Eligible scheduled matches to swap with
        $eligibleMatches = [];

        foreach ($scheduledFixtures as $candidate) {
            // Must be unlocked and not finished
            if (! $this->isFixtureUnlocked($candidate)) {
                continue;
            }

            $candidateTeamCId = (int) $candidate->home_team_id;
            $candidateTeamDId = (int) $candidate->away_team_id;

            // In scheduled list for conflict checks, exclude both $fixture and $candidate
            $otherMatches = $scheduledFixtures->reject(fn ($m) => in_array($m->id, [$fixture->id, $candidate->id], true));

            $candidateDate = Carbon::parse($candidate->scheduled_at);
            $fixtureDate = $fixture->scheduled_at ? Carbon::parse($fixture->scheduled_at) : null;

            // Check if teams A and B can play at candidate's date & time
            $durationMinutes = (int) ($candidate->match?->match_duration_minutes ?? 90);
            $candidateStart = $candidateDate->format('H:i');
            $candidateEnd = $candidateDate->copy()->addMinutes($durationMinutes)->format('H:i');

            if (! $this->satisfiesRestRule($teamAId, $candidateDate, $restDaysRequired, $otherMatches)) {
                continue;
            }
            if (! $this->satisfiesRestRule($teamBId, $candidateDate, $restDaysRequired, $otherMatches)) {
                continue;
            }
            if ($this->hasConflictOnDateTime($teamAId, $candidateDate, $candidateStart, $candidateEnd, $otherMatches)) {
                continue;
            }
            if ($this->hasConflictOnDateTime($teamBId, $candidateDate, $candidateStart, $candidateEnd, $otherMatches)) {
                continue;
            }

            // If current fixture is scheduled, candidate teams C and D must also be free at current fixture's date & time
            if ($fixtureDate) {
                $fDurationMinutes = (int) ($fixture->match?->match_duration_minutes ?? 90);
                $fixtureStart = $fixtureDate->format('H:i');
                $fixtureEnd = $fixtureDate->copy()->addMinutes($fDurationMinutes)->format('H:i');

                if (! $this->satisfiesRestRule($candidateTeamCId, $fixtureDate, $restDaysRequired, $otherMatches)) {
                    continue;
                }
                if (! $this->satisfiesRestRule($candidateTeamDId, $fixtureDate, $restDaysRequired, $otherMatches)) {
                    continue;
                }
                if ($this->hasConflictOnDateTime($candidateTeamCId, $fixtureDate, $fixtureStart, $fixtureEnd, $otherMatches)) {
                    continue;
                }
                if ($this->hasConflictOnDateTime($candidateTeamDId, $fixtureDate, $fixtureStart, $fixtureEnd, $otherMatches)) {
                    continue;
                }
            }

            // Determine if the slot candidate is borrowed
            $isCandidateSlotBorrowed = false;
            $candidateBooking = $candidate->match?->active_reservation_id
                ? TerrainBooking::find($candidate->match->active_reservation_id)
                : null;

            if ($candidateBooking && (int) $candidateBooking->team_id !== $candidateTeamCId) {
                $isCandidateSlotBorrowed = true;
            }

            $currentSlotBorrowed = false;
            $fixtureBooking = $fixture->match?->active_reservation_id
                ? TerrainBooking::find($fixture->match->active_reservation_id)
                : null;
            if ($fixtureBooking && (int) $fixtureBooking->team_id !== $teamAId) {
                $currentSlotBorrowed = true;
            }

            $eligibleMatches[] = [
                'fixture_id' => $candidate->id,
                'matchday' => $candidate->matchday,
                'home_team' => [
                    'id' => $candidate->homeTeam?->id,
                    'name' => $candidate->homeTeam?->name,
                    'logo_url' => $candidate->homeTeam?->logo_url,
                ],
                'away_team' => [
                    'id' => $candidate->awayTeam?->id,
                    'name' => $candidate->awayTeam?->name,
                    'logo_url' => $candidate->awayTeam?->logo_url,
                ],
                'scheduled_at' => $candidate->scheduled_at->format('Y-m-d H:i'),
                'date_str' => $candidate->scheduled_at->format('Y-m-d'),
                'day_name' => $candidate->scheduled_at->translatedFormat('l'),
                'time_str' => $candidate->scheduled_at->format('H:i'),
                'stadium' => $candidate->stadium ? [
                    'id' => $candidate->stadium->id,
                    'name' => $candidate->stadium->name,
                ] : null,
                'is_borrowed' => $isCandidateSlotBorrowed,
                'sort_borrowed_weight' => ($isCandidateSlotBorrowed ? 1 : 0) + ($currentSlotBorrowed ? 1 : 0),
                'days_diff' => $fixtureDate ? abs($fixtureDate->diffInDays($candidateDate)) : 0,
            ];
        }

        // Sort: fewest borrowed-slot results first, then closest date
        usort($eligibleMatches, function ($a, $b) {
            if ($a['sort_borrowed_weight'] !== $b['sort_borrowed_weight']) {
                return $a['sort_borrowed_weight'] <=> $b['sort_borrowed_weight'];
            }
            return $a['days_diff'] <=> $b['days_diff'];
        });

        // 2. Pending or Postponed matches that can take this fixture's slot
        $pendingCandidates = [];
        if ($fixture->scheduled_at) {
            $fixtureDate = Carbon::parse($fixture->scheduled_at);
            $fDurationMinutes = (int) ($fixture->match?->match_duration_minutes ?? 90);
            $fixtureStart = $fixtureDate->format('H:i');
            $fixtureEnd = $fixtureDate->copy()->addMinutes($fDurationMinutes)->format('H:i');

            $waitingOrPostponed = $allFixtures->filter(function ($f) {
                return in_array($f->status, [FixtureStatus::WaitingForBooking, FixtureStatus::ReschedulingRequired, FixtureStatus::Postponed], true)
                    && $this->isFixtureUnlocked($f);
            });

            $activeMatches = $scheduledFixtures->reject(fn ($m) => $m->id === $fixture->id);

            foreach ($waitingOrPostponed as $pw) {
                $pHomeId = (int) $pw->home_team_id;
                $pAwayId = (int) $pw->away_team_id;

                if (! $this->satisfiesRestRule($pHomeId, $fixtureDate, $restDaysRequired, $activeMatches)) {
                    continue;
                }
                if (! $this->satisfiesRestRule($pAwayId, $fixtureDate, $restDaysRequired, $activeMatches)) {
                    continue;
                }
                if ($this->hasConflictOnDateTime($pHomeId, $fixtureDate, $fixtureStart, $fixtureEnd, $activeMatches)) {
                    continue;
                }
                if ($this->hasConflictOnDateTime($pAwayId, $fixtureDate, $fixtureStart, $fixtureEnd, $activeMatches)) {
                    continue;
                }

                $pendingCandidates[] = [
                    'fixture_id' => $pw->id,
                    'matchday' => $pw->matchday,
                    'status' => $pw->status?->value,
                    'status_label' => $pw->status === FixtureStatus::Postponed ? 'مؤجلة' : 'تحتاج جدولة',
                    'home_team' => [
                        'id' => $pw->homeTeam?->id,
                        'name' => $pw->homeTeam?->name,
                        'logo_url' => $pw->homeTeam?->logo_url,
                    ],
                    'away_team' => [
                        'id' => $pw->awayTeam?->id,
                        'name' => $pw->awayTeam?->name,
                        'logo_url' => $pw->awayTeam?->logo_url,
                    ],
                ];
            }
        }

        return [
            'eligible_matches' => $eligibleMatches,
            'pending_candidates' => $pendingCandidates,
        ];
    }

    /**
     * Swap schedules between two fixtures in one atomic transaction.
     * Keeps fixture IDs and teams unchanged. Exchanging only date, time, stadium, and slot occupied.
     *
     * @return array<string, mixed>
     */
    public function swapSchedules(Tournament $tournament, Fixture $fixture, int $targetFixtureId): array
    {
        return DB::transaction(function () use ($tournament, $fixture, $targetFixtureId) {
            $this->assertBelongsToTournament($tournament, $fixture);
            $this->assertNotLockedOrFinished($fixture);

            $target = Fixture::with(['match', 'homeTeam', 'awayTeam', 'stadium'])->findOrFail($targetFixtureId);
            $this->assertBelongsToTournament($tournament, $target);
            $this->assertNotLockedOrFinished($target);

            // Snapshot before states for Undo & Audit
            $fixtureSnapshot = $this->serializeFixtureSnapshot($fixture);
            $targetSnapshot = $this->serializeFixtureSnapshot($target);

            // Exchange dates, stadiums, statuses
            $fixtureScheduledAt = $fixture->scheduled_at;
            $fixtureStadiumId = $fixture->stadium_id;
            $fixtureStatus = $fixture->status;
            $fixtureMatch = $fixture->match;
            $fixtureReservationId = $fixtureMatch?->active_reservation_id;

            $targetScheduledAt = $target->scheduled_at;
            $targetStadiumId = $target->stadium_id;
            $targetStatus = $target->status;
            $targetMatch = $target->match;
            $targetReservationId = $targetMatch?->active_reservation_id;

            // Apply target's schedule to fixture
            $fixture->update([
                'scheduled_at' => $targetScheduledAt,
                'stadium_id' => $targetStadiumId,
                'status' => $targetStatus,
                'is_rescheduled' => true,
                'last_change_payload' => [
                    'action' => 'swap_schedule',
                    'partner_fixture_id' => $target->id,
                    'self_before' => $fixtureSnapshot,
                    'partner_before' => $targetSnapshot,
                ],
            ]);

            if ($fixtureMatch) {
                $fixtureMatch->update([
                    'stadium_id' => $targetStadiumId,
                    'active_reservation_id' => $targetReservationId,
                    'is_confirmed' => true,
                    'status' => MatchStatus::Scheduled,
                ]);
            }

            // Apply fixture's schedule to target
            $target->update([
                'scheduled_at' => $fixtureScheduledAt,
                'stadium_id' => $fixtureStadiumId,
                'status' => $fixtureStatus,
                'is_rescheduled' => true,
                'last_change_payload' => [
                    'action' => 'swap_schedule',
                    'partner_fixture_id' => $fixture->id,
                    'self_before' => $targetSnapshot,
                    'partner_before' => $fixtureSnapshot,
                ],
            ]);

            if ($targetMatch) {
                $targetMatch->update([
                    'stadium_id' => $fixtureStadiumId,
                    'active_reservation_id' => $fixtureReservationId,
                    'is_confirmed' => true,
                    'status' => MatchStatus::Scheduled,
                ]);
            }

            // Link existing TerrainBooking records to their swapped fixtures
            if ($fixtureReservationId && $targetReservationId) {
                TerrainBooking::where('id', $fixtureReservationId)->update(['fixture_id' => $target->id]);
                TerrainBooking::where('id', $targetReservationId)->update(['fixture_id' => $fixture->id]);
            } elseif ($fixtureReservationId) {
                TerrainBooking::where('id', $fixtureReservationId)->update(['fixture_id' => $target->id]);
            } elseif ($targetReservationId) {
                TerrainBooking::where('id', $targetReservationId)->update(['fixture_id' => $fixture->id]);
            }

            // Audit log
            $this->logAudit(
                $fixture,
                'swap_schedule',
                "تم تبديل موعد مباراة ({$fixture->homeTeam?->name} ضد {$fixture->awayTeam?->name}) مع مباراة ({$target->homeTeam?->name} ضد {$target->awayTeam?->name})",
                ['fixture_before' => $fixtureSnapshot, 'target_before' => $targetSnapshot]
            );

            // Notifications
            $this->notifyTeamsAboutChange($tournament, $fixture, 'تم تغيير موعد المباراة بتبديل الموعد مع مباراة أخرى');
            $this->notifyTeamsAboutChange($tournament, $target, 'تم تغيير موعد المباراة بتبديل الموعد مع مباراة أخرى');

            // Sync matchdays
            $this->syncMatchdays($tournament);

            return [
                'message' => 'تم تبديل الموعد بين المباراتين بنجاح',
                'fixture' => $fixture->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']),
                'target' => $target->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']),
            ];
        });
    }

    /**
     * Replace current fixture with a pending or postponed match.
     * Pending fixture takes current fixture's slot; this fixture becomes POSTPONED.
     *
     * @return array<string, mixed>
     */
    public function replaceWithPending(Tournament $tournament, Fixture $fixture, int $pendingFixtureId): array
    {
        return DB::transaction(function () use ($tournament, $fixture, $pendingFixtureId) {
            $this->assertBelongsToTournament($tournament, $fixture);
            $this->assertNotLockedOrFinished($fixture);

            $pending = Fixture::with(['match', 'homeTeam', 'awayTeam', 'stadium'])->findOrFail($pendingFixtureId);
            $this->assertBelongsToTournament($tournament, $pending);
            $this->assertNotLockedOrFinished($pending);

            $fixtureSnapshot = $this->serializeFixtureSnapshot($fixture);
            $pendingSnapshot = $this->serializeFixtureSnapshot($pending);

            $slotScheduledAt = $fixture->scheduled_at;
            $slotStadiumId = $fixture->stadium_id;
            $bookingId = $fixture->match?->active_reservation_id;

            // Pending fixture takes this slot
            $pending->update([
                'scheduled_at' => $slotScheduledAt,
                'stadium_id' => $slotStadiumId,
                'status' => FixtureStatus::Scheduled,
                'unscheduled_reason' => null,
                'is_rescheduled' => true,
                'last_change_payload' => [
                    'action' => 'take_pending_slot',
                    'partner_fixture_id' => $fixture->id,
                    'self_before' => $pendingSnapshot,
                    'partner_before' => $fixtureSnapshot,
                ],
            ]);

            if ($pending->match) {
                $pending->match->update([
                    'stadium_id' => $slotStadiumId,
                    'active_reservation_id' => $bookingId,
                    'status' => MatchStatus::Scheduled,
                    'is_confirmed' => true,
                ]);
            } else {
                $newMatch = FootballMatch::create([
                    'competition_id' => $tournament->competition_id,
                    'season_id' => $tournament->season_id,
                    'round_id' => $pending->round_id,
                    'group_id' => $pending->group_id,
                    'home_team_id' => $pending->home_team_id,
                    'away_team_id' => $pending->away_team_id,
                    'stadium_id' => $slotStadiumId,
                    'status' => MatchStatus::Scheduled,
                    'active_reservation_id' => $bookingId,
                    'is_confirmed' => true,
                    'created_by' => auth()->id() ?? $tournament->organizer_id,
                ]);
                $pending->update(['match_id' => $newMatch->id]);
            }

            if ($bookingId) {
                TerrainBooking::where('id', $bookingId)
                    ->where('reservation_type', 'single')
                    ->update(['fixture_id' => $pending->id]);
            }

            // Current fixture becomes postponed
            $fixture->update([
                'status' => FixtureStatus::Postponed,
                'postponement_reason' => 'replaced_by_pending',
                'postponement_note' => "تم استبدال الموعد بالمباراة المعلقة ({$pending->homeTeam?->name} ضد {$pending->awayTeam?->name})",
                'postponed_from_date' => $slotScheduledAt,
                'scheduled_at' => null,
                'stadium_id' => null,
                'is_rescheduled' => true,
                'last_change_payload' => [
                    'action' => 'replaced_by_pending',
                    'partner_fixture_id' => $pending->id,
                    'self_before' => $fixtureSnapshot,
                    'partner_before' => $pendingSnapshot,
                ],
            ]);

            if ($fixture->match) {
                $fixture->match->update([
                    'status' => MatchStatus::Postponed,
                    'active_reservation_id' => null,
                    'is_confirmed' => false,
                ]);
            }

            // Audit
            $this->logAudit(
                $fixture,
                'replace_with_pending',
                "تم استبدال موعد المباراة بمباراة معلقة ({$pending->homeTeam?->name} ضد {$pending->awayTeam?->name}) ونقل هذه المباراة إلى قائمة المؤجلات",
                ['fixture_before' => $fixtureSnapshot, 'pending_before' => $pendingSnapshot]
            );

            // Notifications
            $this->notifyTeamsAboutChange($tournament, $pending, 'تمت برمجة وتحديد موعد مباراتكم بنجاح');
            $this->notifyTeamsAboutChange($tournament, $fixture, 'تم تأجيل مباراتكم لإفساح الموعد لمباراة معلقة، وستتم إعادة جدولتها قريباً');

            $this->syncMatchdays($tournament);

            return [
                'message' => 'تم استبدال الموعد بنجاح وأصبحت المباراة الحالية مؤجلة',
                'fixture' => $fixture->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']),
                'pending' => $pending->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']),
            ];
        });
    }

    /* -------------------------------------------------------------------------- */
    /* ACTION 2: CHANGE ANY SIDE (HOST OR GUEST) WITH ANOTHER ELIGIBLE TEAM       */
    /* -------------------------------------------------------------------------- */

    /**
     * Get eligible teams to replace side ('home' or 'away') in a fixture.
     * Only returns teams that satisfy all shared criteria. Ineligibles are not listed.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getEligibleTeamsForSide(Tournament $tournament, Fixture $fixture, string $side): array
    {
        $this->assertBelongsToTournament($tournament, $fixture);
        $this->assertNotLockedOrFinished($fixture);

        $isHostSide = ($side === 'home');
        $stayingTeamId = $isHostSide ? (int) $fixture->away_team_id : (int) $fixture->home_team_id;
        $currentSideTeamId = $isHostSide ? (int) $fixture->home_team_id : (int) $fixture->away_team_id;

        // Registered tournament teams except current home and away
        $registeredTeams = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->whereNotIn('team_id', [$stayingTeamId, $currentSideTeamId])
            ->with('team')
            ->get();

        if ($registeredTeams->isEmpty()) {
            return [];
        }

        // Pre-fetch all other fixtures involving stayingTeam in this tournament
        $stayingTeamFixtures = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('id', '!=', $fixture->id)
            ->where(function ($q) use ($stayingTeamId) {
                $q->where('home_team_id', $stayingTeamId)
                    ->orWhere('away_team_id', $stayingTeamId);
            })
            ->with(['homeTeam', 'awayTeam', 'match'])
            ->get();

        $scheduledMatches = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->whereNotNull('scheduled_at')
            ->whereNotIn('status', [FixtureStatus::Cancelled])
            ->get(['id', 'home_team_id', 'away_team_id', 'scheduled_at']);

        $restDaysRequired = (int) ($tournament->rest_days_minimum ?? 1);
        $fixtureDate = $fixture->scheduled_at ? Carbon::parse($fixture->scheduled_at) : null;

        $results = [];

        foreach ($registeredTeams as $tt) {
            $candidateTeam = $tt->team;
            if (! $candidateTeam) {
                continue;
            }

            $candidateId = (int) $candidateTeam->id;

            // Find existing fixture where stayingTeam meets candidateTeam
            $otherFixture = $stayingTeamFixtures->first(function ($f) use ($stayingTeamId, $candidateId) {
                return ((int) $f->home_team_id === $stayingTeamId && (int) $f->away_team_id === $candidateId)
                    || ((int) $f->home_team_id === $candidateId && (int) $f->away_team_id === $stayingTeamId);
            });

            // If other fixture is locked or finished, candidate cannot be swapped
            if ($otherFixture && ! $this->isFixtureUnlocked($otherFixture)) {
                continue;
            }

            $excludedIds = [$fixture->id];
            if ($otherFixture) {
                $excludedIds[] = $otherFixture->id;
            }
            $activeMatches = $scheduledMatches->reject(fn ($m) => in_array($m->id, $excludedIds, true));

            $hasRestWarning = false;

            // Check candidate team at current fixture date/time
            if ($fixtureDate) {
                if (! $this->satisfiesRestRule($candidateId, $fixtureDate, $restDaysRequired, $activeMatches)) {
                    $hasRestWarning = true;
                }

                $duration = (int) ($fixture->match?->match_duration_minutes ?? 90);
                if ($this->hasConflictOnDateTime($candidateId, $fixtureDate, $fixtureDate->format('H:i'), $fixtureDate->copy()->addMinutes($duration)->format('H:i'), $activeMatches)) {
                    continue;
                }
            }

            // Check currentSideTeam at otherFixture date/time
            if ($otherFixture && $otherFixture->scheduled_at) {
                $otherDate = Carbon::parse($otherFixture->scheduled_at);
                $otherDuration = (int) ($otherFixture->match?->match_duration_minutes ?? 90);

                if (! $this->satisfiesRestRule($currentSideTeamId, $otherDate, $restDaysRequired, $activeMatches)) {
                    $hasRestWarning = true;
                }
                if ($this->hasConflictOnDateTime($currentSideTeamId, $otherDate, $otherDate->format('H:i'), $otherDate->copy()->addMinutes($otherDuration)->format('H:i'), $activeMatches)) {
                    continue;
                }
            }

            $results[] = [
                'team_id' => $candidateId,
                'team_name' => $candidateTeam->name,
                'team_logo' => $candidateTeam->logo_url ?? $candidateTeam->logo,
                'has_rest_warning' => $hasRestWarning,
                'other_fixture' => $otherFixture ? [
                    'id' => $otherFixture->id,
                    'matchday' => $otherFixture->matchday,
                    'scheduled_at' => $otherFixture->scheduled_at?->format('Y-m-d H:i'),
                ] : null,
            ];
        }

        return $results;
    }

    /**
     * Change either home or away side with another eligible team.
     * Swaps pairing if already exists elsewhere.
     * If host changed: handles new host slot selection or sets borrowed label.
     *
     * @return array<string, mixed>
     */
    public function changeSide(
        Tournament $tournament,
        Fixture $fixture,
        string $side,
        int $newTeamId,
        ?int $newBookingId = null,
        ?string $newSlotDate = null,
        bool $overrideWarnings = false
    ): array {
        return DB::transaction(function () use ($tournament, $fixture, $side, $newTeamId, $newBookingId, $newSlotDate, $overrideWarnings) {
            $this->assertBelongsToTournament($tournament, $fixture);
            $this->assertNotLockedOrFinished($fixture);

            $isHost = ($side === 'home');
            $stayingTeamId = $isHost ? (int) $fixture->away_team_id : (int) $fixture->home_team_id;
            $oldSideTeamId = $isHost ? (int) $fixture->home_team_id : (int) $fixture->away_team_id;

            if ($newTeamId === $stayingTeamId) {
                throw new DomainException('لا يمكن اختيار نفس الفريق لمواجهة نفسه');
            }
            if ($newTeamId === $oldSideTeamId) {
                throw new DomainException('الفريق المحدد هو نفس الفريق الحالي');
            }

            // Find other fixture where stayingTeam and newTeam meet
            $otherFixture = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->where('id', '!=', $fixture->id)
                ->where(function ($q) use ($stayingTeamId, $newTeamId) {
                    $q->where(function ($sq) use ($stayingTeamId, $newTeamId) {
                        $sq->where('home_team_id', $stayingTeamId)->where('away_team_id', $newTeamId);
                    })->orWhere(function ($sq) use ($stayingTeamId, $newTeamId) {
                        $sq->where('home_team_id', $newTeamId)->where('away_team_id', $stayingTeamId);
                    });
                })
                ->first();

            if ($otherFixture) {
                $this->assertNotLockedOrFinished($otherFixture);
            }

            // Rest Rules & Conflict validation if not overriding
            $restDaysRequired = (int) ($tournament->rest_days_minimum ?? 1);
            $fixtureDate = $fixture->scheduled_at ? Carbon::parse($fixture->scheduled_at) : null;
            $scheduledMatches = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->whereNotIn('id', array_filter([$fixture->id, $otherFixture?->id]))
                ->whereNotNull('scheduled_at')
                ->whereNotIn('status', [FixtureStatus::Cancelled])
                ->get(['id', 'home_team_id', 'away_team_id', 'scheduled_at']);

            if ($fixtureDate && ! $overrideWarnings) {
                if (! $this->satisfiesRestRule($newTeamId, $fixtureDate, $restDaysRequired, $scheduledMatches)) {
                    $newTeam = \App\Domains\Team\Models\Team::find($newTeamId);
                    throw new \App\Domains\Tournament\Exceptions\SchedulingWarningException(
                        'الفريق الجديد ('.($newTeam?->name ?? '').') لديه تعارض مع قاعدة فترة الراحة الإلزامية في موعد هذه المباراة',
                        'rest_rule_conflict',
                        'تعارض فترة الراحة للفريق الجديد',
                        $newTeam?->name
                    );
                }
            }

            if ($otherFixture && $otherFixture->scheduled_at && ! $overrideWarnings) {
                $otherDate = Carbon::parse($otherFixture->scheduled_at);
                if (! $this->satisfiesRestRule($oldSideTeamId, $otherDate, $restDaysRequired, $scheduledMatches)) {
                    $oldTeam = \App\Domains\Team\Models\Team::find($oldSideTeamId);
                    throw new \App\Domains\Tournament\Exceptions\SchedulingWarningException(
                        'الفريق السابق ('.($oldTeam?->name ?? '').') لديه تعارض مع قاعدة فترة الراحة الإلزامية في موعد المواجهة المقابلة',
                        'rest_rule_conflict',
                        'تعارض فترة الراحة للفريق المستبدل',
                        $oldTeam?->name
                    );
                }
            }

            // Snapshot before states
            $fixtureSnapshot = $this->serializeFixtureSnapshot($fixture);
            $otherSnapshot = $otherFixture ? $this->serializeFixtureSnapshot($otherFixture) : null;

            // 1. Update this fixture side
            $fixtureUpdates = [
                $isHost ? 'home_team_id' : 'away_team_id' => $newTeamId,
                'is_rescheduled' => true,
                'last_change_payload' => [
                    'action' => 'change_side',
                    'side' => $side,
                    'partner_fixture_id' => $otherFixture?->id,
                    'self_before' => $fixtureSnapshot,
                    'partner_before' => $otherSnapshot,
                ],
            ];

            // 2. If host changed: handle slot logic
            if ($isHost) {
                $activeBooking = $fixture->match?->active_reservation_id
                    ? TerrainBooking::find($fixture->match->active_reservation_id)
                    : null;

                if ($newBookingId && $newSlotDate) {
                    // Organizer chose one of the new host's unused slots
                    $newBooking = TerrainBooking::with(['terrain', 'team'])->findOrFail($newBookingId);

                    // Release old booking back to unused pool
                    if ($activeBooking) {
                        $activeBooking->update(['fixture_id' => null]);
                    }

                    // Apply new booking slot
                    $newScheduledAt = Carbon::parse($newSlotDate.' '.$newBooking->start_time);
                    $fixtureUpdates['scheduled_at'] = $newScheduledAt;
                    $fixtureUpdates['stadium_id'] = $newBooking->terrain_id;
                    $fixtureUpdates['slot_note'] = null;

                    $newBooking->update(['fixture_id' => $fixture->id]);

                    if ($fixture->match) {
                        $fixture->match->update([
                            'home_team_id' => $newTeamId,
                            'stadium_id' => $newBooking->terrain_id,
                            'active_reservation_id' => $newBooking->id,
                            'status' => MatchStatus::Scheduled,
                            'is_confirmed' => true,
                        ]);
                    }
                } else {
                    // Keep match where it is. Check slot ownership
                    if ($activeBooking && (int) $activeBooking->team_id !== $newTeamId) {
                        $slotOwnerName = $activeBooking->team?->name ?? 'صاحب الحجز';
                        $fixtureUpdates['slot_note'] = "موعد مستعار من {$slotOwnerName}";
                    } else {
                        $fixtureUpdates['slot_note'] = null;
                    }

                    if ($fixture->match) {
                        $fixture->match->update([
                            'home_team_id' => $newTeamId,
                        ]);
                    }
                }
            } else {
                // Only guest changed
                if ($fixture->match) {
                    $fixture->match->update([
                        'away_team_id' => $newTeamId,
                    ]);
                }
            }

            $fixture->update($fixtureUpdates);

            // 3. Update other fixture to replace newTeam with oldSideTeam
            if ($otherFixture) {
                $otherUpdates = [
                    'is_rescheduled' => true,
                    'last_change_payload' => [
                        'action' => 'change_side_partner',
                        'partner_fixture_id' => $fixture->id,
                        'self_before' => $otherSnapshot,
                        'partner_before' => $fixtureSnapshot,
                    ],
                ];

                if ((int) $otherFixture->home_team_id === $stayingTeamId) {
                    $otherUpdates['away_team_id'] = $oldSideTeamId;
                    if ($otherFixture->match) {
                        $otherFixture->match->update(['away_team_id' => $oldSideTeamId]);
                    }
                } else {
                    $otherUpdates['home_team_id'] = $oldSideTeamId;
                    if ($otherFixture->match) {
                        $otherFixture->match->update(['home_team_id' => $oldSideTeamId]);
                    }
                }

                $otherFixture->update($otherUpdates);
            }

            // Audit
            $sideName = $isHost ? 'المضيف' : 'الضيف';
            $this->logAudit(
                $fixture,
                'change_side',
                "تم تغيير الفريق {$sideName} لمباراة ({$fixture->homeTeam?->name} ضد {$fixture->awayTeam?->name}) ومبادلة المواجهة بالدوري",
                ['fixture_before' => $fixtureSnapshot, 'other_before' => $otherSnapshot]
            );

            // Notifications
            $this->notifyTeamsAboutChange($tournament, $fixture, "تم تحديث أطراف المباراة لتصبح: {$fixture->fresh()->homeTeam?->name} ضد {$fixture->fresh()->awayTeam?->name}");
            if ($otherFixture) {
                $this->notifyTeamsAboutChange($tournament, $otherFixture, "تم تحديث أطراف المباراة لتصبح: {$otherFixture->fresh()->homeTeam?->name} ضد {$otherFixture->fresh()->awayTeam?->name}");
            }

            $this->syncMatchdays($tournament);

            return [
                'message' => 'تم تغيير الفريق بنجاح مع المحافظة على سلامة جدول الدوري',
                'fixture' => $fixture->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']),
                'other_fixture' => $otherFixture ? $otherFixture->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']) : null,
            ];
        });
    }

    /* -------------------------------------------------------------------------- */
    /* ACTION 3: SWAP ROLES (HOST ⇄ GUEST, TEAMS STAY THE SAME)                   */
    /* -------------------------------------------------------------------------- */

    /**
     * Swap host and guest roles for the match.
     * Date, time, stadium unchanged by default.
     * If slot belongs to new guest, displays note: "الموعد يخص {owner} (الضيف)".
     * Optional follow up moves to new host's slot if provided.
     *
     * @return array<string, mixed>
     */
    public function swapRoles(
        Tournament $tournament,
        Fixture $fixture,
        ?int $newBookingId = null,
        ?string $newSlotDate = null
    ): array {
        return DB::transaction(function () use ($tournament, $fixture, $newBookingId, $newSlotDate) {
            $this->assertBelongsToTournament($tournament, $fixture);
            $this->assertNotLockedOrFinished($fixture);

            $oldHomeId = (int) $fixture->home_team_id;
            $oldAwayId = (int) $fixture->away_team_id;

            // New roles:
            $newHomeId = $oldAwayId;
            $newAwayId = $oldHomeId;

            $fixtureSnapshot = $this->serializeFixtureSnapshot($fixture);

            $activeBooking = $fixture->match?->active_reservation_id
                ? TerrainBooking::with('team')->find($fixture->match->active_reservation_id)
                : null;

            $fixtureUpdates = [
                'home_team_id' => $newHomeId,
                'away_team_id' => $newAwayId,
                'is_rescheduled' => true,
                'last_change_payload' => [
                    'action' => 'swap_roles',
                    'self_before' => $fixtureSnapshot,
                ],
            ];

            // If move to new host slot was chosen
            if ($newBookingId && $newSlotDate) {
                $newBooking = TerrainBooking::with(['terrain', 'team'])->findOrFail($newBookingId);

                if ($activeBooking) {
                    $activeBooking->update(['fixture_id' => null]);
                }

                $newScheduledAt = Carbon::parse($newSlotDate.' '.$newBooking->start_time);
                $fixtureUpdates['scheduled_at'] = $newScheduledAt;
                $fixtureUpdates['stadium_id'] = $newBooking->terrain_id;
                $fixtureUpdates['slot_note'] = null;

                $newBooking->update(['fixture_id' => $fixture->id]);

                if ($fixture->match) {
                    $fixture->match->update([
                        'home_team_id' => $newHomeId,
                        'away_team_id' => $newAwayId,
                        'stadium_id' => $newBooking->terrain_id,
                        'active_reservation_id' => $newBooking->id,
                        'status' => MatchStatus::Scheduled,
                        'is_confirmed' => true,
                    ]);
                }
            } else {
                // Keep date, time, and stadium where it is
                // If slot owner is now the guest
                if ($activeBooking && (int) $activeBooking->team_id === $newAwayId) {
                    $ownerName = $activeBooking->team?->name ?? 'الفريق الضيف';
                    $fixtureUpdates['slot_note'] = "الموعد يخص {$ownerName} (الضيف)";
                } elseif ($activeBooking && (int) $activeBooking->team_id === $newHomeId) {
                    $fixtureUpdates['slot_note'] = null;
                }

                if ($fixture->match) {
                    $fixture->match->update([
                        'home_team_id' => $newHomeId,
                        'away_team_id' => $newAwayId,
                    ]);
                }
            }

            $fixture->update($fixtureUpdates);

            // Audit
            $this->logAudit(
                $fixture,
                'swap_roles',
                "تم عكس أدوار الفريقين لتصبح المباراة بضيافة {$fixture->homeTeam?->name} ضد {$fixture->awayTeam?->name}",
                ['fixture_before' => $fixtureSnapshot]
            );

            // Notifications
            $this->notifyTeamsAboutChange($tournament, $fixture, "تم تبادل دور الاستضافة: {$fixture->fresh()->homeTeam?->name} (المضيف) ضد {$fixture->fresh()->awayTeam?->name} (الضيف)");

            $this->syncMatchdays($tournament);

            return [
                'message' => 'تم عكس أدوار الفريقين بنجاح',
                'fixture' => $fixture->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']),
            ];
        });
    }

    /* -------------------------------------------------------------------------- */
    /* UNDO SUPPORT (RESTORING EVERYTHING RESTORES BOTH MATCHES, SLOTS, HOSTS)     */
    /* -------------------------------------------------------------------------- */

    /**
     * Undo the last change applied to a fixture.
     *
     * @return array<string, mixed>
     */
    public function undoLastChange(Tournament $tournament, Fixture $fixture): array
    {
        return DB::transaction(function () use ($tournament, $fixture) {
            $this->assertBelongsToTournament($tournament, $fixture);

            $payload = $fixture->last_change_payload;
            if (empty($payload) || ! isset($payload['self_before'])) {
                throw new DomainException('لا يوجد إجراء سابق قابل للتراجع عنه لهذه المباراة');
            }

            $selfBefore = $payload['self_before'];
            $partnerFixtureId = $payload['partner_fixture_id'] ?? null;
            $partnerBefore = $payload['partner_before'] ?? null;

            // Restore self fixture
            $this->restoreFixtureFromSnapshot($fixture, $selfBefore);

            // Restore partner fixture if exists
            $partner = null;
            if ($partnerFixtureId && $partnerBefore) {
                $partner = Fixture::find($partnerFixtureId);
                if ($partner) {
                    $this->restoreFixtureFromSnapshot($partner, $partnerBefore);
                }
            }

            // Audit log
            $this->logAudit(
                $fixture,
                'undo_change',
                "تم التراجع عن آخر تعديل واستعادة الحالة السابقة للمباراة",
                ['undone_payload' => $payload]
            );

            // Notifications
            $this->notifyTeamsAboutChange($tournament, $fixture, 'تم التراجع عن التعديل الأخير وإعادة برمجة المباراة كما كانت');
            if ($partner) {
                $this->notifyTeamsAboutChange($tournament, $partner, 'تم التراجع عن التعديل الأخير وإعادة برمجة المباراة كما كانت');
            }

            $this->syncMatchdays($tournament);

            return [
                'message' => 'تم التراجع عن التعديل واستعادة الحالة السابقة بنجاح',
                'fixture' => $fixture->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']),
                'partner' => $partner ? $partner->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']) : null,
            ];
        });
    }

    /**
     * Get unused slots for a team that are eligible for scheduling.
     * Same criteria as postponement suggestions.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getUnusedSlotsForTeam(Tournament $tournament, Fixture $fixture, int $hostTeamId): array
    {
        $guestTeamId = (int) $fixture->away_team_id === $hostTeamId
            ? (int) $fixture->home_team_id
            : (int) $fixture->away_team_id;

        $assignmentService = $this->leagueAssignment ?? app(LeagueAssignmentService::class);
        $slots = $assignmentService->projectAvailableSlots($tournament, [$hostTeamId]);

        $scheduledMatches = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('id', '!=', $fixture->id)
            ->whereNotNull('scheduled_at')
            ->whereNotIn('status', [FixtureStatus::Cancelled, FixtureStatus::Postponed])
            ->get(['id', 'home_team_id', 'away_team_id', 'scheduled_at']);

        $restDaysRequired = (int) ($tournament->rest_days_minimum ?? 1);
        $suggestions = [];

        foreach ($slots as $slot) {
            $booking = $slot['booking'];
            $slotDate = $slot['date'];
            $slotStart = $slot['start_time'];
            $slotEnd = $slot['end_time'];
            $slotDateTime = $slot['datetime'];

            // Both host and guest must be free
            if ($this->hasConflictOnDateTime($hostTeamId, $slotDate, $slotStart, $slotEnd, $scheduledMatches)) {
                continue;
            }
            if ($this->hasConflictOnDateTime($guestTeamId, $slotDate, $slotStart, $slotEnd, $scheduledMatches)) {
                continue;
            }

            // Both must satisfy rest rule
            if (! $this->satisfiesRestRule($hostTeamId, $slotDate, $restDaysRequired, $scheduledMatches)) {
                continue;
            }
            if (! $this->satisfiesRestRule($guestTeamId, $slotDate, $restDaysRequired, $scheduledMatches)) {
                continue;
            }

            $suggestions[] = [
                'id' => "host_slot_{$booking->id}_{$slot['date_str']}",
                'booking_id' => $booking->id,
                'date' => $slot['date_str'],
                'day_name' => $slotDate->translatedFormat('l'),
                'time' => $slotStart.' - '.$slotEnd,
                'start_time' => $slotStart,
                'end_time' => $slotEnd,
                'datetime' => $slotDateTime->toDateTimeString(),
                'stadium' => $booking->terrain ? [
                    'id' => $booking->terrain->id,
                    'name' => $booking->terrain->name,
                    'city' => $booking->terrain->city,
                ] : null,
                'is_weekly' => $slot['is_weekly'],
            ];
        }

        usort($suggestions, fn ($a, $b) => strcmp($a['datetime'], $b['datetime']));

        return $suggestions;
    }

    /* -------------------------------------------------------------------------- */
    /* HELPER UTILITIES                                                           */
    /* -------------------------------------------------------------------------- */

    private function serializeFixtureSnapshot(Fixture $fixture): array
    {
        return [
            'id' => $fixture->id,
            'home_team_id' => $fixture->home_team_id,
            'away_team_id' => $fixture->away_team_id,
            'stadium_id' => $fixture->stadium_id,
            'scheduled_at' => $fixture->scheduled_at?->toDateTimeString(),
            'status' => $fixture->status?->value ?? (string) $fixture->status,
            'slot_note' => $fixture->slot_note,
            'is_rescheduled' => (bool) $fixture->is_rescheduled,
            'postponement_reason' => $fixture->postponement_reason,
            'postponement_note' => $fixture->postponement_note,
            'postponed_from_date' => $fixture->postponed_from_date?->toDateTimeString(),
            'active_reservation_id' => $fixture->match?->active_reservation_id,
            'match_status' => $fixture->match?->status?->value ?? (string) $fixture->match?->status,
        ];
    }

    private function restoreFixtureFromSnapshot(Fixture $fixture, array $snapshot): void
    {
        $fixture->update([
            'home_team_id' => $snapshot['home_team_id'],
            'away_team_id' => $snapshot['away_team_id'],
            'stadium_id' => $snapshot['stadium_id'],
            'scheduled_at' => $snapshot['scheduled_at'] ? Carbon::parse($snapshot['scheduled_at']) : null,
            'status' => $snapshot['status'],
            'slot_note' => $snapshot['slot_note'],
            'is_rescheduled' => $snapshot['is_rescheduled'],
            'postponement_reason' => $snapshot['postponement_reason'],
            'postponement_note' => $snapshot['postponement_note'],
            'postponed_from_date' => $snapshot['postponed_from_date'] ? Carbon::parse($snapshot['postponed_from_date']) : null,
            'last_change_payload' => null, // clear after restore
        ]);

        if ($fixture->match) {
            $fixture->match->update([
                'home_team_id' => $snapshot['home_team_id'],
                'away_team_id' => $snapshot['away_team_id'],
                'stadium_id' => $snapshot['stadium_id'],
                'active_reservation_id' => $snapshot['active_reservation_id'],
                'status' => $snapshot['match_status'] ?? MatchStatus::Scheduled,
                'is_confirmed' => (bool) $snapshot['active_reservation_id'],
            ]);
        }

        // Fix booking link
        if (! empty($snapshot['active_reservation_id'])) {
            TerrainBooking::where('id', $snapshot['active_reservation_id'])
                ->where('reservation_type', 'single')
                ->update(['fixture_id' => $fixture->id]);
        }
    }

    private function assertBelongsToTournament(Tournament $tournament, Fixture $fixture): void
    {
        if ((int) $fixture->competition_id !== (int) $tournament->competition_id) {
            throw new DomainException('المباراة لا تنتمي إلى هذا الدوري');
        }
    }

    private function syncMatchdays(Tournament $tournament): void
    {
        $service = $this->fixtureService ?? app(TournamentFixtureService::class);
        $service->syncLeagueMatchdays($tournament);
    }

    private function logAudit(Fixture $fixture, string $action, string $description, array $changes): void
    {
        try {
            MatchResultAudit::create([
                'match_id' => $fixture->match_id,
                'fixture_id' => $fixture->id,
                'user_id' => auth()->id(),
                'action' => 'league_match_management:'.$action,
                'description' => $description,
                'changes' => $changes,
            ]);
        } catch (\Throwable $e) {
            // Non-blocking audit logging
            report($e);
        }
    }

    private function notifyTeamsAboutChange(Tournament $tournament, Fixture $fixture, string $body): void
    {
        $homeTeam = $fixture->homeTeam;
        $awayTeam = $fixture->awayTeam;
        $title = 'تحديث في جدول مباريات '.$tournament->name;

        if ($homeTeam?->manager_id) {
            NotificationService::push(
                (int) $homeTeam->manager_id,
                'fixture_rescheduled',
                $title,
                $body,
                ['tournament_id' => $tournament->id, 'fixture_id' => $fixture->id],
                '/dashboard'
            );
        }

        if ($awayTeam?->manager_id) {
            NotificationService::push(
                (int) $awayTeam->manager_id,
                'fixture_rescheduled',
                $title,
                $body,
                ['tournament_id' => $tournament->id, 'fixture_id' => $fixture->id],
                '/dashboard'
            );
        }
    }
}
