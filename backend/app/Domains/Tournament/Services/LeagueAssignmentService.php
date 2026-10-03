<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Notification\Services\NotificationService;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LeagueAssignmentService
{
    public function __construct(
        private readonly ?TournamentFixtureService $fixtureService = null,
        private readonly ?TournamentTerrainBookingService $bookingService = null,
    ) {}
    /**
     * Project all concrete available match slots from enrolled teams' single and weekly bookings.
     *
     * @param  Tournament  $tournament
     * @param  array<int>  $teamIds
     * @param  string|null  $customFirstDay
     * @return Collection<int, array<string, mixed>>
     */
    public function projectAvailableSlots(Tournament $tournament, array $teamIds, ?string $customFirstDay = null): Collection
    {
        if (empty($teamIds)) {
            return collect();
        }

        $allowedStadiumIds = $tournament->stadiums()->pluck('stadiums.id')->all();

        $today = Carbon::today();
        $baseDate = $customFirstDay
            ? Carbon::parse($customFirstDay)
            : ($tournament->first_match_day
                ? Carbon::parse($tournament->first_match_day->toDateString())
                : ($tournament->start_date ? Carbon::parse($tournament->start_date->toDateString()) : $today->copy()));

        $effectiveMin = $baseDate->lt($today) ? $today->copy() : $baseDate;
        $endDate = $tournament->end_date ? Carbon::parse($tournament->end_date->toDateString()) : $effectiveMin->copy()->addMonths(3);

        // Pre-fetch all scheduled fixtures in tournament to check occupied slots
        $scheduledFixtures = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->whereNotNull('scheduled_at')
            ->whereNotIn('status', [FixtureStatus::Cancelled])
            ->get(['id', 'stadium_id', 'scheduled_at']);

        $occupiedSlots = [];
        foreach ($scheduledFixtures as $sf) {
            if ($sf->stadium_id && $sf->scheduled_at) {
                $occupiedSlots[$sf->stadium_id.'_'.$sf->scheduled_at->format('Y-m-d H:i')] = true;
            }
        }

        $slots = collect();

        // 1. Single Bookings
        $singleBookings = TerrainBooking::query()
            ->whereIn('team_id', $teamIds)
            ->whereIn('status', ['approved', 'confirmed'])
            ->whereNull('archived_at')
            ->whereNull('fixture_id')
            ->where(function ($q) {
                $q->whereNull('reservation_type')
                    ->orWhere('reservation_type', '!=', 'weekly_subscription');
            })
            ->whereDate('booking_date', '>=', $effectiveMin->toDateString())
            ->whereDate('booking_date', '<=', $endDate->toDateString())
            ->when(! empty($allowedStadiumIds), fn ($q) => $q->whereIn('terrain_id', $allowedStadiumIds))
            ->with(['terrain', 'team'])
            ->get();

        foreach ($singleBookings as $booking) {
            $date = Carbon::parse($booking->booking_date);
            $datetime = Carbon::parse($date->toDateString().' '.$booking->start_time);

            if ($datetime->isPast()) {
                continue;
            }

            $key = $booking->terrain_id.'_'.$datetime->format('Y-m-d H:i');
            if (isset($occupiedSlots[$key])) {
                continue;
            }

            $slots->push([
                'booking' => $booking,
                'date' => $date,
                'date_str' => $date->toDateString(),
                'start_time' => $booking->start_time,
                'end_time' => $booking->end_time,
                'datetime' => $datetime,
                'terrain_id' => (int) $booking->terrain_id,
                'owner_team_id' => (int) $booking->team_id,
                'is_weekly' => false,
            ]);
        }

        // 2. Weekly Recurring Subscriptions
        $weeklyBookings = TerrainBooking::query()
            ->whereIn('team_id', $teamIds)
            ->whereIn('status', ['approved', 'confirmed'])
            ->whereNull('archived_at')
            ->where('reservation_type', 'weekly_subscription')
            ->when(! empty($allowedStadiumIds), fn ($q) => $q->whereIn('terrain_id', $allowedStadiumIds))
            ->with(['terrain', 'team'])
            ->get();

        foreach ($weeklyBookings as $booking) {
            $subStart = $booking->start_date ? Carbon::parse($booking->start_date->toDateString()) : $effectiveMin->copy();
            $subEnd = $booking->end_date ? Carbon::parse($booking->end_date->toDateString()) : $endDate->copy();

            $windowStart = $subStart->gt($effectiveMin) ? $subStart : $effectiveMin->copy();
            $windowEnd = $subEnd->lt($endDate) ? $subEnd : $endDate->copy();

            $targetDow = $booking->day_of_week ?? $subStart->dayOfWeek;

            $cursor = $windowStart->copy();
            $daysToAdd = ($targetDow - $cursor->dayOfWeek + 7) % 7;
            $cursor->addDays($daysToAdd);

            $iterations = 0;
            while ($cursor->lte($windowEnd) && $iterations < 52) {
                $iterations++;
                $datetime = Carbon::parse($cursor->toDateString().' '.$booking->start_time);

                if (! $datetime->isPast()) {
                    $key = $booking->terrain_id.'_'.$datetime->format('Y-m-d H:i');
                    if (! isset($occupiedSlots[$key])) {
                        $slots->push([
                            'booking' => $booking,
                            'date' => $cursor->copy(),
                            'date_str' => $cursor->toDateString(),
                            'start_time' => $booking->start_time,
                            'end_time' => $booking->end_time,
                            'datetime' => $datetime,
                            'terrain_id' => (int) $booking->terrain_id,
                            'owner_team_id' => (int) $booking->team_id,
                            'is_weekly' => true,
                        ]);
                    }
                }

                $cursor->addWeek();
            }
        }

        return $slots->sortBy('datetime')->values();
    }

    /**
     * Generate explainable match suggestions for a league tournament
     * based on available active home bookings of enrolled teams.
     *
     * @return array<int, array<string, mixed>>
     */
    public function suggestions(Tournament $tournament): array
    {
        $registeredTeamIds = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->pluck('team_id')
            ->all();

        if (empty($registeredTeamIds)) {
            return [];
        }

        // 1. Fetch all available projected slots (single + weekly recurring)
        $slots = $this->projectAvailableSlots($tournament, $registeredTeamIds);

        // 2. Fetch all unscheduled fixtures in this league
        $unscheduledFixtures = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->whereNull('scheduled_at')
            ->where(function ($q) {
                $q->whereNull('match_id')
                    ->orWhereIn('status', [
                        FixtureStatus::WaitingForBooking,
                        FixtureStatus::ReschedulingRequired,
                        FixtureStatus::Scheduled,
                    ]);
            })
            ->with(['homeTeam', 'awayTeam'])
            ->get();

        // 3. Pre-fetch existing scheduled league matches for rest calculations
        $scheduledMatches = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->whereNotNull('scheduled_at')
            ->whereNotIn('status', [FixtureStatus::Cancelled])
            ->get(['id', 'home_team_id', 'away_team_id', 'scheduled_at']);

        $restDaysRequired = (int) ($tournament->rest_days_minimum ?? 1);
        $suggestions = [];

        foreach ($slots as $slot) {
            $booking = $slot['booking'];
            $homeTeamId = $slot['owner_team_id'];
            $bookingDate = $slot['date'];
            $bookingStart = $slot['start_time'];
            $bookingEnd = $slot['end_time'];

            // Find fixtures where this team is the designated HOME team
            $candidateFixtures = $unscheduledFixtures->filter(
                fn (Fixture $f) => (int) $f->home_team_id === $homeTeamId && $f->away_team_id !== null
            );

            foreach ($candidateFixtures as $fixture) {
                $awayTeamId = (int) $fixture->away_team_id;

                // Evaluate hard constraints with explainable messages
                $validations = [];
                $canAssign = true;

                // Rule A: Home team has confirmed booking
                $validations[] = [
                    'rule' => 'home_booking',
                    'label' => 'حجز مؤكد للفريق المضيف في الملعب والوقت المحددين',
                    'passed' => true,
                ];

                // Rule B: Fixture is pending
                $validations[] = [
                    'rule' => 'fixture_required',
                    'label' => 'المواجهة مستحقة وفقاً لجدول مباريات الدوري',
                    'passed' => true,
                ];

                // Rule C: Away team has no conflict on the same datetime
                $awayConflict = $this->hasConflictOnDateTime(
                    $awayTeamId,
                    $bookingDate,
                    $bookingStart,
                    $bookingEnd,
                    $scheduledMatches
                );

                if ($awayConflict) {
                    $canAssign = false;
                    $validations[] = [
                        'rule' => 'opponent_available',
                        'label' => 'الفريق الضيف لديه مباراة أخرى في نفس التوقيت',
                        'passed' => false,
                    ];
                } else {
                    $validations[] = [
                        'rule' => 'opponent_available',
                        'label' => 'الفريق الضيف متاح ولا توجد مباريات متعارضة',
                        'passed' => true,
                    ];
                }

                // Rule D: Mandatory Rest Rule (for both Home and Away team)
                $restViolations = [];
                if ($restDaysRequired > 0) {
                    $homeRestOk = $this->satisfiesRestRule(
                        $homeTeamId,
                        $bookingDate,
                        $restDaysRequired,
                        $scheduledMatches
                    );

                    $awayRestOk = $this->satisfiesRestRule(
                        $awayTeamId,
                        $bookingDate,
                        $restDaysRequired,
                        $scheduledMatches
                    );

                    if (! $homeRestOk) {
                        $restViolations[] = 'الفريق المضيف خاض/سيخوض مباراة قريبة جداً';
                    }
                    if (! $awayRestOk) {
                        $restViolations[] = 'الفريق الضيف خاض/سيخوض مباراة قريبة جداً';
                    }
                }

                if (! empty($restViolations)) {
                    $canAssign = false;
                    $validations[] = [
                        'rule' => 'rest_rule',
                        'label' => 'فترة الراحة غير مستوفاة (يلزم '.$restDaysRequired.' يوم راحة على الأقل): '.implode('، ', $restViolations),
                        'passed' => false,
                    ];
                } else {
                    $validations[] = [
                        'rule' => 'rest_rule',
                        'label' => 'قاعدة الراحة محققة ('.$restDaysRequired.' يوم راحة على الأقل للفريقين)',
                        'passed' => true,
                    ];
                }

                // Rule E: Pitch validity
                $validations[] = [
                    'rule' => 'pitch_allowed',
                    'label' => 'الملعب معتمد ومؤهل لإقامة مباريات الدوري',
                    'passed' => true,
                ];

                $suggestions[] = [
                    'id' => "sug_{$booking->id}_{$slot['date_str']}_{$fixture->id}",
                    'booking' => [
                        'id' => $booking->id,
                        'reference' => $booking->booking_reference,
                        'booking_date' => $slot['date_str'],
                        'start_time' => $slot['start_time'],
                        'end_time' => $slot['end_time'],
                        'is_weekly' => $slot['is_weekly'],
                        'terrain' => $booking->terrain ? [
                            'id' => $booking->terrain->id,
                            'name' => $booking->terrain->name,
                            'city' => $booking->terrain->city,
                        ] : null,
                    ],
                    'fixture' => [
                        'id' => $fixture->id,
                        'matchday' => $fixture->matchday,
                        'home_team' => $fixture->homeTeam ? [
                            'id' => $fixture->homeTeam->id,
                            'name' => $fixture->homeTeam->name,
                            'logo_url' => $fixture->homeTeam->logo_url,
                        ] : null,
                        'away_team' => $fixture->awayTeam ? [
                            'id' => $fixture->awayTeam->id,
                            'name' => $fixture->awayTeam->name,
                            'logo_url' => $fixture->awayTeam->logo_url,
                        ] : null,
                    ],
                    'can_assign' => $canAssign,
                    'validations' => $validations,
                ];
            }
        }

        return $suggestions;
    }

    /**
     * Postpone a single match with an explicit reason and optional note.
     * Releases any active terrain reservation back to the unused pool and sets status to POSTPONED.
     *
     * @return array<string, mixed>
     */
    public function postponeMatch(
        Tournament $tournament,
        Fixture $fixture,
        string $reason,
        ?string $note = null
    ): array {
        return DB::transaction(function () use ($tournament, $fixture, $reason, $note) {
            if ($fixture->match && $fixture->match->status === MatchStatus::Finished) {
                throw new DomainException('لا يمكن تأجيل مباراة مكتملة ومسجلة نتائجها');
            }

            $originalScheduledAt = $fixture->scheduled_at;

            $fixture->forceFill([
                'status' => FixtureStatus::Postponed,
                'postponement_reason' => $reason,
                'postponement_note' => $note,
                'postponed_from_date' => $originalScheduledAt,
                'scheduled_at' => null,
            ])->save();

            if ($fixture->match) {
                $fixture->match->forceFill([
                    'status' => MatchStatus::Postponed,
                    'is_confirmed' => false,
                    'active_reservation_id' => null,
                ])->save();
            }

            // Release booking back to pool so it can be reused immediately
            $bookingService = $this->bookingService ?? app(TournamentTerrainBookingService::class);
            $bookingService->archiveForFixture($fixture);

            // Notify both teams via in-app & WhatsApp link
            $homeTeam = $fixture->homeTeam;
            $awayTeam = $fixture->awayTeam;
            $title = 'تأجيل مباراة في '.$tournament->name;
            $reasonLabels = [
                'rain' => 'أمطار',
                'pitch_condition' => 'ظروف الملعب',
                'team_circumstances' => 'ظروف أحد الفريقين',
                'other' => 'أخرى',
            ];
            $reasonLabel = $reasonLabels[$reason] ?? $reason;
            $body = "تم تأجيل مباراة {$homeTeam?->name} ضد {$awayTeam?->name} بسبب: {$reasonLabel}".($note ? " ({$note})" : '');

            if ($homeTeam?->manager_id) {
                NotificationService::push(
                    (int) $homeTeam->manager_id,
                    'match_postponed',
                    $title,
                    $body,
                    ['tournament_id' => $tournament->id, 'fixture_id' => $fixture->id],
                    '/dashboard'
                );
            }
            if ($awayTeam?->manager_id) {
                NotificationService::push(
                    (int) $awayTeam->manager_id,
                    'match_postponed',
                    $title,
                    $body,
                    ['tournament_id' => $tournament->id, 'fixture_id' => $fixture->id],
                    '/dashboard'
                );
            }

            return [
                'fixture' => $fixture->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']),
                'message' => 'تم تأجيل المباراة بنجاح، ويمكنكم إعادة جدولتها من الاقتراحات المتاحة.',
            ];
        });
    }

    /**
     * Generate suggestions for rescheduling a postponed match.
     * Scans unused future confirmed slots of team A and team B after original date.
     * Filters out slots breaking rest days, overlapping other matches, or blocked.
     * Shows host team clearly based on slot ownership.
     *
     * @return array<int, array<string, mixed>>
     */
    public function postponementSuggestions(Tournament $tournament, Fixture $fixture): array
    {
        $teamAId = (int) $fixture->home_team_id;
        $teamBId = (int) $fixture->away_team_id;
        $involvedTeamIds = array_filter([$teamAId, $teamBId]);

        if (empty($involvedTeamIds)) {
            return [];
        }

        $minDate = $fixture->postponed_from_date
            ? Carbon::parse($fixture->postponed_from_date->toDateString())
            : Carbon::today();

        $slots = $this->projectAvailableSlots($tournament, $involvedTeamIds, $minDate->toDateString());

        // Pre-fetch other scheduled matches excluding this fixture
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
            $slotOwnerId = (int) $slot['owner_team_id'];
            $slotDate = $slot['date'];
            $slotStart = $slot['start_time'];
            $slotEnd = $slot['end_time'];
            $slotDateTime = $slot['datetime'];

            // Must be strictly after the original match date if postponed_from_date exists
            if ($fixture->postponed_from_date && $slotDateTime->lte($fixture->postponed_from_date)) {
                continue;
            }

            // Both teams must be free from overlapping matches
            if ($this->hasConflictOnDateTime($teamAId, $slotDate, $slotStart, $slotEnd, $scheduledMatches)) {
                continue;
            }
            if ($this->hasConflictOnDateTime($teamBId, $slotDate, $slotStart, $slotEnd, $scheduledMatches)) {
                continue;
            }

            // Both teams must satisfy the rest day rule
            if (! $this->satisfiesRestRule($teamAId, $slotDate, $restDaysRequired, $scheduledMatches)) {
                continue;
            }
            if (! $this->satisfiesRestRule($teamBId, $slotDate, $restDaysRequired, $scheduledMatches)) {
                continue;
            }

            // Slot owner is always the host team
            $newHostId = $slotOwnerId;
            $newGuestId = ($newHostId === $teamAId) ? $teamBId : $teamAId;

            $hostTeam = ($newHostId === $teamAId) ? $fixture->homeTeam : $fixture->awayTeam;
            $guestTeam = ($newGuestId === $teamAId) ? $fixture->homeTeam : $fixture->awayTeam;

            $isHostChanged = ($newHostId !== $teamAId);

            $suggestions[] = [
                'id' => "postpone_sug_{$booking->id}_{$slot['date_str']}",
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
                'host_team' => $hostTeam ? [
                    'id' => $hostTeam->id,
                    'name' => $hostTeam->name,
                    'logo_url' => $hostTeam->logo_url,
                ] : null,
                'guest_team' => $guestTeam ? [
                    'id' => $guestTeam->id,
                    'name' => $guestTeam->name,
                    'logo_url' => $guestTeam->logo_url,
                ] : null,
                'is_host_changed' => $isHostChanged,
                'host_changed_note' => $isHostChanged ? "المضيف سيتغير إلى {$hostTeam?->name} (صاحب الحجز)" : null,
                'is_weekly' => $slot['is_weekly'],
            ];
        }

        // Sorted by closest date after original date
        usort($suggestions, fn ($a, $b) => strcmp($a['datetime'], $b['datetime']));

        return $suggestions;
    }

    /**
     * Reschedule a postponed match using a selected suggestion in one tap.
     * Retains same fixture ID and pairing; updates date, time, stadium, slot, and host.
     * Status becomes SCHEDULED. Week numbers are re-synchronized.
     *
     * @return array<string, mixed>
     */
    public function rescheduleWithSuggestion(
        Tournament $tournament,
        Fixture $fixture,
        int $bookingId,
        string $dateStr
    ): array {
        return DB::transaction(function () use ($tournament, $fixture, $bookingId, $dateStr) {
            $booking = TerrainBooking::with(['terrain', 'team'])->findOrFail($bookingId);

            $slotOwnerId = (int) $booking->team_id;
            $teamAId = (int) $fixture->home_team_id;
            $teamBId = (int) $fixture->away_team_id;

            if ($slotOwnerId !== $teamAId && $slotOwnerId !== $teamBId) {
                throw new DomainException('الحجز المحدد لا يتبع لأي من الفريقين المشاركين في المباراة');
            }

            // Assign slot owner as home team
            $newHomeId = $slotOwnerId;
            $newAwayId = ($newHomeId === $teamAId) ? $teamBId : $teamAId;

            $scheduledAt = Carbon::parse($dateStr.' '.$booking->start_time);

            // Update or create FootballMatch
            $match = $fixture->match;
            if (! $match) {
                $match = FootballMatch::create([
                    'competition_id' => $tournament->competition_id,
                    'season_id' => $tournament->season_id,
                    'round_id' => $fixture->round_id,
                    'group_id' => $fixture->group_id,
                    'home_team_id' => $newHomeId,
                    'away_team_id' => $newAwayId,
                    'stadium_id' => $booking->terrain_id,
                    'status' => MatchStatus::Scheduled,
                    'active_reservation_id' => $booking->id,
                    'match_duration_minutes' => $tournament->match_duration_minutes ?? 90,
                    'is_confirmed' => true,
                    'created_by' => auth()->id() ?? $tournament->organizer_id,
                ]);
            } else {
                $match->update([
                    'home_team_id' => $newHomeId,
                    'away_team_id' => $newAwayId,
                    'stadium_id' => $booking->terrain_id,
                    'active_reservation_id' => $booking->id,
                    'status' => MatchStatus::Scheduled,
                    'is_confirmed' => true,
                ]);
            }

            // Update fixture
            $fixture->update([
                'home_team_id' => $newHomeId,
                'away_team_id' => $newAwayId,
                'match_id' => $match->id,
                'stadium_id' => $booking->terrain_id,
                'scheduled_at' => $scheduledAt,
                'status' => FixtureStatus::Scheduled,
                'unscheduled_reason' => null,
                'postponement_reason' => null,
                'postponement_note' => null,
            ]);

            // Link single booking
            if (! $booking->isWeeklySubscription()) {
                $booking->update([
                    'fixture_id' => $fixture->id,
                ]);
            }

            // Re-sync league week numbers dynamically
            $fixtureService = $this->fixtureService ?? app(TournamentFixtureService::class);
            $fixtureService->syncLeagueMatchdays($tournament);

            // Notify both teams
            $this->notifyMatchAssignment($tournament, $fixture, $booking);

            return [
                'fixture' => $fixture->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']),
                'message' => 'تمت إعادة جدولة وتثبيت المباراة بنجاح.',
            ];
        });
    }
    public function capacityCheck(Tournament $tournament, ?string $customFirstDay = null): array
    {
        $registeredTeamIds = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->pluck('team_id')
            ->all();

        $totalFixtures = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->count();

        $scheduledFixtures = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->whereNotNull('scheduled_at')
            ->whereNotIn('status', [FixtureStatus::Cancelled])
            ->count();

        $unscheduledCount = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->whereNull('scheduled_at')
            ->count();

        $slots = $this->projectAvailableSlots($tournament, $registeredTeamIds, $customFirstDay);
        $availableSlotsCount = $slots->count();

        $firstSlot = $slots->first();
        $firstAvailableDate = $firstSlot ? $firstSlot['date_str'] : null;
        $firstAvailableTime = $firstSlot ? $firstSlot['start_time'] : null;

        $targetFirstDay = $customFirstDay
            ?: ($tournament->first_match_day?->toDateString() ?: $tournament->start_date?->toDateString());

        $hasSlotOnExactFirstDay = false;
        if ($targetFirstDay && $slots->isNotEmpty()) {
            $hasSlotOnExactFirstDay = $slots->contains(fn ($s) => $s['date_str'] === $targetFirstDay);
        }

        $sufficient = $availableSlotsCount >= $unscheduledCount;

        return [
            'total_fixtures' => $totalFixtures,
            'scheduled_fixtures' => $scheduledFixtures,
            'unscheduled_fixtures' => $unscheduledCount,
            'available_slots' => $availableSlotsCount,
            'first_available_date' => $firstAvailableDate,
            'first_available_time' => $firstAvailableTime,
            'has_slot_on_chosen_day' => $hasSlotOnExactFirstDay,
            'target_first_day' => $targetFirstDay,
            'sufficient' => $sufficient,
            'warning' => $sufficient ? null : "تنبيه: عدد الفترات والحجوزات المتاحة ({$availableSlotsCount}) غير كافٍ لبرمجة كافة المباريات المتبقية ({$unscheduledCount}). المواجهات التي لا يتوفر لها موعد ستصنف كمباريات تتطلب البرمجة.",
        ];
    }

    /**
     * Automatically schedule Single Round Robin league fixtures into available booking slots.
     * Respects:
     * 1. Booking owner = Home team.
     * 2. Mandatory rest rule: $|Date_A - Date_B| > 1$.
     * 3. Borrowed slot exception: allocate available slot to unassigned pair if owner is resting/unavailable.
     * 4. Unscheduled matches move to exceptions with explicit reason.
     *
     * @param  Tournament  $tournament
     * @param  string|null  $firstMatchDay
     * @return array<string, mixed>
     */
    public function autoSchedule(Tournament $tournament, ?string $firstMatchDay = null): array
    {
        return DB::transaction(function () use ($tournament, $firstMatchDay) {
            if ($firstMatchDay) {
                $tournament->forceFill(['first_match_day' => $firstMatchDay])->save();
            }

            $registeredTeamIds = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->pluck('team_id')
                ->all();

            if (empty($registeredTeamIds)) {
                throw new DomainException('لا توجد فرق مسجلة في هذا الدوري');
            }

            // 1. Fetch all unscheduled fixtures in this league
            $unscheduledFixtures = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->whereNull('scheduled_at')
                ->where(function ($q) {
                    $q->whereNull('match_id')
                        ->orWhereIn('status', [
                            FixtureStatus::WaitingForBooking,
                            FixtureStatus::ReschedulingRequired,
                        ]);
                })
                ->with(['homeTeam', 'awayTeam'])
                ->get();

            if ($unscheduledFixtures->isEmpty()) {
                return [
                    'scheduled_count' => 0,
                    'unscheduled_count' => 0,
                    'borrowed_slots_count' => 0,
                    'total_fixtures' => 0,
                    'message' => 'كافة مباريات الدوري مجدولة بالفعل، لا توجد مواجهات بانتظار البرمجة',
                ];
            }

            // 2. Pre-fetch existing scheduled fixtures
            $scheduledMatches = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->whereNotNull('scheduled_at')
                ->whereNotIn('status', [FixtureStatus::Cancelled])
                ->get(['id', 'home_team_id', 'away_team_id', 'scheduled_at']);

            $restDaysRequired = (int) ($tournament->rest_days_minimum ?? 1);

            // 3. Project available slots
            $availableSlots = $this->projectAvailableSlots($tournament, $registeredTeamIds, $firstMatchDay);

            $scheduledCount = 0;
            $borrowedCount = 0;
            $unassignedPool = $unscheduledFixtures->keyBy('id');

            foreach ($availableSlots as $slot) {
                if ($unassignedPool->isEmpty()) {
                    break;
                }

                $ownerTeamId = $slot['owner_team_id'];
                $slotDate = $slot['date'];
                $slotStart = $slot['start_time'];
                $slotEnd = $slot['end_time'];
                $slotDateTime = $slot['datetime'];

                $assignedFixture = null;
                $isBorrowed = false;

                // --- Phase A: Owner plays at Home ---
                $ownerCanPlay = ! $this->hasConflictOnDateTime($ownerTeamId, $slotDate, $slotStart, $slotEnd, $scheduledMatches)
                    && $this->satisfiesRestRule($ownerTeamId, $slotDate, $restDaysRequired, $scheduledMatches);

                if ($ownerCanPlay) {
                    foreach ($unassignedPool as $fixture) {
                        $isOwnerHome = ((int) $fixture->home_team_id === $ownerTeamId);
                        $isOwnerAway = ((int) $fixture->away_team_id === $ownerTeamId);

                        if (! $isOwnerHome && ! $isOwnerAway) {
                            continue;
                        }

                        $opponentId = $isOwnerHome ? (int) $fixture->away_team_id : (int) $fixture->home_team_id;

                        // Check opponent eligibility
                        $opponentCanPlay = ! $this->hasConflictOnDateTime($opponentId, $slotDate, $slotStart, $slotEnd, $scheduledMatches)
                            && $this->satisfiesRestRule($opponentId, $slotDate, $restDaysRequired, $scheduledMatches);

                        if ($opponentCanPlay) {
                            // Booking owner must be Home team
                            if (! $isOwnerHome) {
                                $fixture->home_team_id = $ownerTeamId;
                                $fixture->away_team_id = $opponentId;
                            }

                            $assignedFixture = $fixture;
                            $isBorrowed = false;
                            break;
                        }
                    }
                }

                // --- Phase B: Borrowed Slot Exception ---
                // If owner is resting/unavailable or has no remaining opponents, allocate slot to another unassigned pair
                if (! $assignedFixture) {
                    foreach ($unassignedPool as $fixture) {
                        $t1 = (int) $fixture->home_team_id;
                        $t2 = (int) $fixture->away_team_id;

                        // Neither team can have conflicts or violate rest rule
                        $t1CanPlay = ! $this->hasConflictOnDateTime($t1, $slotDate, $slotStart, $slotEnd, $scheduledMatches)
                            && $this->satisfiesRestRule($t1, $slotDate, $restDaysRequired, $scheduledMatches);

                        $t2CanPlay = ! $this->hasConflictOnDateTime($t2, $slotDate, $slotStart, $slotEnd, $scheduledMatches)
                            && $this->satisfiesRestRule($t2, $slotDate, $restDaysRequired, $scheduledMatches);

                        if ($t1CanPlay && $t2CanPlay) {
                            $assignedFixture = $fixture;
                            $isBorrowed = true;
                            break;
                        }
                    }
                }

                // If a fixture was selected, commit the assignment
                if ($assignedFixture) {
                    $this->commitSlotAssignment($tournament, $assignedFixture, $slot, $isBorrowed);

                    $scheduledCount++;
                    if ($isBorrowed) {
                        $borrowedCount++;
                    }

                    // Add to scheduled tracking collection
                    $scheduledMatches->push((object) [
                        'id' => $assignedFixture->id,
                        'home_team_id' => $assignedFixture->home_team_id,
                        'away_team_id' => $assignedFixture->away_team_id,
                        'scheduled_at' => $slotDateTime,
                    ]);

                    $unassignedPool->forget($assignedFixture->id);
                }
            }

            // --- Phase C: Handle Unscheduled Exceptions ---
            $remainingCount = $unassignedPool->count();
            foreach ($unassignedPool as $remainingFixture) {
                $reason = $availableSlots->isEmpty() ? 'no_available_slots' : 'rest_or_schedule_conflict';

                $remainingFixture->update([
                    'status' => FixtureStatus::ReschedulingRequired,
                    'unscheduled_reason' => $reason,
                ]);
            }

            $firstSlot = $availableSlots->first();
            $firstAvailableDate = $firstSlot ? $firstSlot['date_str'] : null;
            $firstAvailableTime = $firstSlot ? $firstSlot['start_time'] : null;

            $targetFirstDay = $firstMatchDay
                ?: ($tournament->first_match_day?->toDateString() ?: $tournament->start_date?->toDateString());

            $hasSlotOnExactFirstDay = false;
            if ($targetFirstDay && $availableSlots->isNotEmpty()) {
                $hasSlotOnExactFirstDay = $availableSlots->contains(fn ($s) => $s['date_str'] === $targetFirstDay);
            }

            $message = "اكتملت الجدولة التلقائية: تم تحديد مواعيد {$scheduledCount} مباراة ({$borrowedCount} بتوقيت مستعار)، و{$remainingCount} مواجهة بحاجة لبرمجة يدوية.";
            if ($targetFirstDay && ! $hasSlotOnExactFirstDay && $firstAvailableDate) {
                $message .= " (أول موعد متاح: {$firstAvailableDate} {$firstAvailableTime})";
            }

            return [
                'scheduled_count' => $scheduledCount,
                'unscheduled_count' => $remainingCount,
                'borrowed_slots_count' => $borrowedCount,
                'total_fixtures' => $unscheduledFixtures->count(),
                'first_available_date' => $firstAvailableDate,
                'first_available_time' => $firstAvailableTime,
                'has_slot_on_chosen_day' => $hasSlotOnExactFirstDay,
                'target_first_day' => $targetFirstDay,
                'message' => $message,
            ];
        });
    }

    /**
     * Atomically link a slot to a fixture.
     */
    private function commitSlotAssignment(
        Tournament $tournament,
        Fixture $fixture,
        array $slot,
        bool $isBorrowed
    ): void {
        $booking = $slot['booking'];
        $scheduledAt = $slot['datetime'];
        $notes = $isBorrowed
            ? 'توقيت مستعار من حجز فريق '.($booking->team?->name ?? 'آخر')
            : null;

        $match = $fixture->match;
        if (! $match) {
            $match = FootballMatch::create([
                'competition_id' => $tournament->competition_id,
                'season_id' => $tournament->season_id,
                'round_id' => $fixture->round_id,
                'group_id' => $fixture->group_id,
                'home_team_id' => $fixture->home_team_id,
                'away_team_id' => $fixture->away_team_id,
                'stadium_id' => $slot['terrain_id'],
                'status' => MatchStatus::Scheduled,
                'active_reservation_id' => $booking->id,
                'match_duration_minutes' => $tournament->match_duration_minutes ?? 90,
                'is_confirmed' => true,
                'notes' => $notes,
                'created_by' => auth()->id() ?? $tournament->organizer_id,
            ]);
        } else {
            $match->update([
                'home_team_id' => $fixture->home_team_id,
                'away_team_id' => $fixture->away_team_id,
                'stadium_id' => $slot['terrain_id'],
                'active_reservation_id' => $booking->id,
                'status' => MatchStatus::Scheduled,
                'is_confirmed' => true,
                'notes' => $notes ?? $match->notes,
            ]);
        }

        $fixture->update([
            'home_team_id' => $fixture->home_team_id,
            'away_team_id' => $fixture->away_team_id,
            'match_id' => $match->id,
            'stadium_id' => $slot['terrain_id'],
            'scheduled_at' => $scheduledAt,
            'status' => FixtureStatus::Scheduled,
            'unscheduled_reason' => null,
        ]);

        if (! $slot['is_weekly']) {
            $booking->update([
                'fixture_id' => $fixture->id,
            ]);
        }

        $this->notifyMatchAssignment($tournament, $fixture, $booking);
    }

    /**
     * Return eligible opponents for swapping in a league fixture.
     * In a single round-robin tournament, swapping with opponent C means
     * swapping the pairing with the fixture where team A plays team C.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getEligibleOpponents(Tournament $tournament, Fixture $fixture): array
    {
        if ((int) $fixture->competition_id !== (int) $tournament->competition_id) {
            throw new DomainException('المباراة لا تنتمي إلى هذا الدوري');
        }

        if ($fixture->match && $fixture->match->status === MatchStatus::Finished) {
            return [];
        }

        $homeTeamId = (int) $fixture->home_team_id;
        $currentOpponentId = (int) $fixture->away_team_id;

        // Fetch all registered teams in tournament except current home & away teams
        $registeredTeams = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->whereNotIn('team_id', [$homeTeamId, $currentOpponentId])
            ->with('team')
            ->get();

        if ($registeredTeams->isEmpty()) {
            return [];
        }

        // Pre-fetch all fixtures involving homeTeam in this tournament (excluding this fixture)
        $homeTeamFixtures = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('id', '!=', $fixture->id)
            ->where(function ($q) use ($homeTeamId) {
                $q->where('home_team_id', $homeTeamId)
                    ->orWhere('away_team_id', $homeTeamId);
            })
            ->with(['homeTeam', 'awayTeam', 'stadium', 'match'])
            ->get();

        // Pre-fetch scheduled fixtures for rest days and conflict checking
        $scheduledMatches = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->whereNotNull('scheduled_at')
            ->whereNotIn('status', [FixtureStatus::Cancelled])
            ->get(['id', 'home_team_id', 'away_team_id', 'scheduled_at']);

        $restDaysRequired = (int) ($tournament->rest_days_minimum ?? 1);
        $fixtureScheduledAt = $fixture->scheduled_at ? Carbon::parse($fixture->scheduled_at) : null;

        $results = [];

        foreach ($registeredTeams as $tt) {
            $candidateTeam = $tt->team;
            if (! $candidateTeam) {
                continue;
            }

            $candidateId = (int) $candidateTeam->id;

            // Find the fixture where homeTeam meets candidateTeam
            $otherFixture = $homeTeamFixtures->first(function ($f) use ($homeTeamId, $candidateId) {
                return ((int) $f->home_team_id === $homeTeamId && (int) $f->away_team_id === $candidateId)
                    || ((int) $f->home_team_id === $candidateId && (int) $f->away_team_id === $homeTeamId);
            });

            $isEligible = true;
            $ineligibilityReasons = [];

            // 1. If other fixture exists, check if it's already played/finished
            if ($otherFixture) {
                if ($otherFixture->status === FixtureStatus::Played || ($otherFixture->match && $otherFixture->match->status === MatchStatus::Finished)) {
                    $isEligible = false;
                    $ineligibilityReasons[] = 'المباراة المقابلة بين الفريقين ملعوبة ومسجلة نتيجتها بالفعل';
                }
            }

            // Exclude fixture and otherFixture from conflict checks
            $excludedIds = [$fixture->id];
            if ($otherFixture) {
                $excludedIds[] = $otherFixture->id;
            }
            $activeMatches = $scheduledMatches->reject(fn ($m) => in_array($m->id, $excludedIds));

            // 2. Check Candidate Team C at Fixture 1 date (if scheduled)
            if ($fixtureScheduledAt && $isEligible) {
                $restOk = $this->satisfiesRestRule($candidateId, $fixtureScheduledAt, $restDaysRequired, $activeMatches);
                if (! $restOk) {
                    $isEligible = false;
                    $ineligibilityReasons[] = 'تعارض مع فترة الراحة الإلزامية للفريق في موعد هذه المباراة';
                }

                $conflict = $this->hasConflictOnDateTime(
                    $candidateId,
                    $fixtureScheduledAt,
                    $fixtureScheduledAt->format('H:i'),
                    $fixtureScheduledAt->copy()->addHours(2)->format('H:i'),
                    $activeMatches
                );
                if ($conflict) {
                    $isEligible = false;
                    $ineligibilityReasons[] = 'الفريق لديه مباراة أخرى مبرمجة في نفس توقيت هذه المباراة';
                }
            }

            // 3. Check Current Opponent B at Other Fixture date (if scheduled)
            if ($otherFixture && $otherFixture->scheduled_at && $isEligible) {
                $otherScheduledAt = Carbon::parse($otherFixture->scheduled_at);

                $bRestOk = $this->satisfiesRestRule($currentOpponentId, $otherScheduledAt, $restDaysRequired, $activeMatches);
                if (! $bRestOk) {
                    $isEligible = false;
                    $ineligibilityReasons[] = 'الخصم الحالي لديه تعارض مع فترة الراحة في موعد المواجهة البديلة';
                }

                $bConflict = $this->hasConflictOnDateTime(
                    $currentOpponentId,
                    $otherScheduledAt,
                    $otherScheduledAt->format('H:i'),
                    $otherScheduledAt->copy()->addHours(2)->format('H:i'),
                    $activeMatches
                );
                if ($bConflict) {
                    $isEligible = false;
                    $ineligibilityReasons[] = 'الخصم الحالي لديه مباراة أخرى مبرمجة في توقيت المواجهة البديلة';
                }
            }

            $results[] = [
                'team_id' => $candidateId,
                'team_name' => $candidateTeam->name,
                'team_logo' => $candidateTeam->logo_url ?? $candidateTeam->logo,
                'is_eligible' => $isEligible,
                'ineligibility_reasons' => $ineligibilityReasons,
                'other_fixture' => $otherFixture ? [
                    'id' => $otherFixture->id,
                    'matchday' => $otherFixture->matchday,
                    'scheduled_at' => $otherFixture->scheduled_at?->format('Y-m-d H:i'),
                    'stadium_name' => $otherFixture->stadium?->name,
                    'is_home' => (int) $otherFixture->home_team_id === $homeTeamId,
                ] : null,
            ];
        }

        return $results;
    }

    /**
     * Backend validation and execution for swapping an opponent in a Single Round Robin fixture.
     * Swapping opponent C with current opponent B swaps the pairings across the two rounds
     * so that round-robin uniqueness and fairness are fully preserved.
     *
     * @return array<string, mixed>
     */
    public function changeOpponent(Tournament $tournament, Fixture $fixture, int $newOpponentId): array
    {
        return DB::transaction(function () use ($tournament, $fixture, $newOpponentId) {
            if ((int) $fixture->competition_id !== (int) $tournament->competition_id) {
                throw new DomainException('المباراة لا تنتمي إلى هذا الدوري');
            }

            if ($fixture->match && $fixture->match->status === MatchStatus::Finished) {
                throw new DomainException('لا يمكن تغيير الخصم لمباراة ملعوبة ومكتملة');
            }

            if ((int) $fixture->home_team_id === $newOpponentId) {
                throw new DomainException('لا يمكن تعيين الفريق المضيف كخصم لنفسه');
            }

            if ((int) $fixture->away_team_id === $newOpponentId) {
                throw new DomainException('الفريق المحدد هو الخصم الحالي بالفعل');
            }

            // Check if new opponent is registered in the tournament
            $isRegistered = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('team_id', $newOpponentId)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->exists();

            if (! $isRegistered) {
                throw new DomainException('الفريق المحدد غير مسجل أو غير مؤكد في هذا الدوري');
            }

            $homeTeamId = (int) $fixture->home_team_id;
            $oldOpponentId = (int) $fixture->away_team_id;

            // Find the paired fixture where homeTeam and newOpponent meet in this tournament
            $otherFixture = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->where('id', '!=', $fixture->id)
                ->where(function ($q) use ($homeTeamId, $newOpponentId) {
                    $q->where(function ($sq) use ($homeTeamId, $newOpponentId) {
                        $sq->where('home_team_id', $homeTeamId)
                            ->where('away_team_id', $newOpponentId);
                    })->orWhere(function ($sq) use ($homeTeamId, $newOpponentId) {
                        $sq->where('home_team_id', $newOpponentId)
                            ->where('away_team_id', $homeTeamId);
                    });
                })
                ->first();

            if ($otherFixture) {
                if ($otherFixture->status === FixtureStatus::Played || ($otherFixture->match && $otherFixture->match->status === MatchStatus::Finished)) {
                    throw new DomainException('لا يمكن التبديل لأن المباراة المقابلة بين الفريقين ملعوبة ومسجلة نتيجتها بالفعل');
                }
            }

            $restDaysRequired = (int) ($tournament->rest_days_minimum ?? 1);

            $excludedIds = [$fixture->id];
            if ($otherFixture) {
                $excludedIds[] = $otherFixture->id;
            }

            $scheduledMatches = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->whereNotIn('id', $excludedIds)
                ->whereNotNull('scheduled_at')
                ->whereNotIn('status', [FixtureStatus::Cancelled])
                ->get(['id', 'home_team_id', 'away_team_id', 'scheduled_at']);

            // 1. Verify rest rule and time conflict for new opponent in Fixture 1
            if ($fixture->scheduled_at) {
                $targetDate = Carbon::parse($fixture->scheduled_at);

                $restOk = $this->satisfiesRestRule($newOpponentId, $targetDate, $restDaysRequired, $scheduledMatches);
                if (! $restOk) {
                    throw new DomainException('الفريق الجديد لديه تعارض مع قاعدة فترة الراحة الإلزامية في موعد هذه المباراة');
                }

                $conflict = $this->hasConflictOnDateTime(
                    $newOpponentId,
                    $targetDate,
                    $targetDate->format('H:i'),
                    $targetDate->copy()->addHours(2)->format('H:i'),
                    $scheduledMatches
                );
                if ($conflict) {
                    throw new DomainException('الفريق الجديد لديه مباراة أخرى مبرمجة في نفس التوقيت');
                }
            }

            // 2. Verify rest rule and time conflict for old opponent in Other Fixture (if scheduled)
            if ($otherFixture && $otherFixture->scheduled_at) {
                $otherTargetDate = Carbon::parse($otherFixture->scheduled_at);

                $oldRestOk = $this->satisfiesRestRule($oldOpponentId, $otherTargetDate, $restDaysRequired, $scheduledMatches);
                if (! $oldRestOk) {
                    throw new DomainException('الفريق الخصم السابق لديه تعارض مع قاعدة فترة الراحة الإلزامية في موعد المواجهة البديلة');
                }

                $oldConflict = $this->hasConflictOnDateTime(
                    $oldOpponentId,
                    $otherTargetDate,
                    $otherTargetDate->format('H:i'),
                    $otherTargetDate->copy()->addHours(2)->format('H:i'),
                    $scheduledMatches
                );
                if ($oldConflict) {
                    throw new DomainException('الفريق الخصم السابق لديه مباراة أخرى مبرمجة في توقيت المواجهة البديلة');
                }
            }

            // Apply update to Fixture 1: away_team_id becomes newOpponentId
            $fixture->update([
                'away_team_id' => $newOpponentId,
            ]);

            if ($fixture->match) {
                $fixture->match->update([
                    'away_team_id' => $newOpponentId,
                ]);
            }

            // Apply update to Other Fixture (if exists in round-robin):
            // Replace newOpponentId with oldOpponentId
            $swappedMatchday = null;
            if ($otherFixture) {
                $swappedMatchday = $otherFixture->matchday;
                if ((int) $otherFixture->home_team_id === $homeTeamId) {
                    $otherFixture->update([
                        'away_team_id' => $oldOpponentId,
                    ]);
                    if ($otherFixture->match) {
                        $otherFixture->match->update([
                            'away_team_id' => $oldOpponentId,
                        ]);
                    }
                } else {
                    $otherFixture->update([
                        'home_team_id' => $oldOpponentId,
                    ]);
                    if ($otherFixture->match) {
                        $otherFixture->match->update([
                            'home_team_id' => $oldOpponentId,
                        ]);
                    }
                }
            }

            $message = $swappedMatchday
                ? "تم تبديل الفريق الخصم بنجاح ومبادلة المواجهة مع مواجهة الجولة {$swappedMatchday}"
                : 'تم تبديل الفريق الخصم بنجاح';

            return [
                'fixture' => $fixture->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']),
                'other_fixture' => $otherFixture ? $otherFixture->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']) : null,
                'old_opponent_id' => $oldOpponentId,
                'new_opponent_id' => $newOpponentId,
                'message' => $message,
            ];
        });
    }

    /**
     * Atomically assign an existing booking to a league fixture and provision the match.
     */
    public function assign(Tournament $tournament, Fixture $fixture, TerrainBooking $booking, bool $allowBorrowed = false, ?string $slotDate = null): array
    {
        return DB::transaction(function () use ($tournament, $fixture, $booking, $allowBorrowed, $slotDate) {
            // Re-validate consistency
            if ((int) $fixture->competition_id !== (int) $tournament->competition_id) {
                throw new DomainException('المباراة لا تنتمي إلى هذا الدوري');
            }

            $isHomeBooking = ((int) $booking->team_id === (int) $fixture->home_team_id);
            if (! $isHomeBooking && ! $allowBorrowed) {
                throw new DomainException('الحجز يجب أن يكون تابعاً للفريق المضيف (أو تفعيل خيار استعارة توقيت)');
            }

            if (! $booking->isWeeklySubscription()) {
                if ($booking->fixture_id && (int) $booking->fixture_id !== (int) $fixture->id) {
                    throw new DomainException('هذا الحجز مرتبط بمباراة أخرى بالفعل');
                }
            }

            if ($fixture->match && $fixture->match->status === MatchStatus::Finished) {
                throw new DomainException('لا يمكن إعادة جدولة مباراة ملعوبة');
            }

            if ($slotDate) {
                $bookingDateStr = $slotDate;
            } elseif ($booking->isWeeklySubscription()) {
                $display = $booking->displayDate();
                $bookingDateStr = $display ? $display->toDateString() : now()->toDateString();
            } else {
                $bookingDateStr = $booking->booking_date instanceof Carbon
                    ? $booking->booking_date->toDateString()
                    : (string) $booking->booking_date;
            }

            $scheduledAt = Carbon::parse($bookingDateStr.' '.$booking->start_time);

            $notes = null;
            if (! $isHomeBooking) {
                $notes = 'توقيت مستعار من فريق '.($booking->team?->name ?? 'آخر');
            }

            // Create or update the FootballMatch entity
            $match = $fixture->match;
            if (! $match) {
                $match = FootballMatch::create([
                    'competition_id' => $tournament->competition_id,
                    'season_id' => $tournament->season_id,
                    'round_id' => $fixture->round_id,
                    'group_id' => $fixture->group_id,
                    'home_team_id' => $fixture->home_team_id,
                    'away_team_id' => $fixture->away_team_id,
                    'stadium_id' => $booking->terrain_id,
                    'status' => MatchStatus::Scheduled,
                    'active_reservation_id' => $booking->id,
                    'match_duration_minutes' => $tournament->match_duration_minutes ?? 90,
                    'is_confirmed' => true,
                    'notes' => $notes,
                    'created_by' => auth()->id() ?? $tournament->organizer_id,
                ]);
            } else {
                $match->update([
                    'stadium_id' => $booking->terrain_id,
                    'active_reservation_id' => $booking->id,
                    'status' => MatchStatus::Scheduled,
                    'is_confirmed' => true,
                    'notes' => $notes ?? $match->notes,
                ]);
            }

            // Link fixture
            $fixture->update([
                'match_id' => $match->id,
                'stadium_id' => $booking->terrain_id,
                'scheduled_at' => $scheduledAt,
                'status' => FixtureStatus::Scheduled,
                'unscheduled_reason' => null,
            ]);

            // Link booking if not a recurring weekly subscription
            if (! $booking->isWeeklySubscription()) {
                $booking->update([
                    'fixture_id' => $fixture->id,
                ]);
            }

            // Notify team managers
            $this->notifyMatchAssignment($tournament, $fixture, $booking);

            return [
                'fixture' => $fixture->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']),
                'booking' => $booking->fresh(),
                'is_borrowed' => ! $isHomeBooking,
                'message' => 'تم اعتماد وتثبيت المباراة وربطها بالحجز بنجاح'.(! $isHomeBooking ? ' (توقيت مستعار)' : ''),
            ];
        });
    }

    /**
     * Unassign a booking from a fixture, preserving the fixture in waiting_for_booking status.
     */
    public function unassign(Tournament $tournament, Fixture $fixture): array
    {
        return DB::transaction(function () use ($tournament, $fixture) {
            if ((int) $fixture->competition_id !== (int) $tournament->competition_id) {
                throw new DomainException('المباراة لا تنتمي إلى هذا الدوري');
            }

            if ($fixture->match && $fixture->match->status === MatchStatus::Finished) {
                throw new DomainException('لا يمكن إلغاء ربط مباراة ملعوبة');
            }

            // Unlink booking if exists and not weekly subscription
            $booking = TerrainBooking::query()->where('fixture_id', $fixture->id)->first()
                ?? ($fixture->match?->active_reservation_id ? TerrainBooking::find($fixture->match->active_reservation_id) : null);
            if ($booking && ! $booking->isWeeklySubscription()) {
                $booking->update(['fixture_id' => null]);
            }

            // If match exists and not played, remove or set cancelled
            if ($fixture->match_id) {
                $match = $fixture->match;
                $fixture->update(['match_id' => null]);
                if ($match && $match->status === MatchStatus::Scheduled) {
                    $match->delete();
                }
            }

            // Reset fixture to waiting for booking
            $fixture->update([
                'scheduled_at' => null,
                'stadium_id' => null,
                'status' => FixtureStatus::WaitingForBooking,
                'unscheduled_reason' => null,
            ]);

            return [
                'fixture' => $fixture->fresh(['homeTeam', 'awayTeam', 'stadium']),
                'message' => 'تم إلغاء ربط الحجز بالمباراة، وبقيت المواجهة في قائمة الانتظار',
            ];
        });
    }

    /**
     * Handle booking cancellation: dissociate booking without deleting the fixture.
     */
    public function handleBookingCancellation(TerrainBooking $booking): void
    {
        if (! $booking->fixture_id) {
            return;
        }

        $fixture = Fixture::find($booking->fixture_id);
        if (! $fixture) {
            return;
        }

        // Dissociate booking
        $booking->update(['fixture_id' => null]);

        $match = $fixture->match;

        // Never delete the fixture! Change status to rescheduling_required and unlink match/stadium/date
        $fixture->update([
            'match_id' => null,
            'scheduled_at' => null,
            'stadium_id' => null,
            'status' => FixtureStatus::ReschedulingRequired,
        ]);

        if ($match && $match->status === MatchStatus::Scheduled) {
            $match->update([
                'status' => MatchStatus::Cancelled,
                'active_reservation_id' => null,
            ]);
        }
    }

    /**
     * Check if a team has a scheduled match overlapping datetime.
     */
    private function hasConflictOnDateTime(
        int $teamId,
        Carbon $bookingDate,
        string $startTime,
        string $endTime,
        Collection $scheduledFixtures
    ): bool {
        $dateStr = $bookingDate->toDateString();

        foreach ($scheduledFixtures as $f) {
            if ((int) $f->home_team_id !== $teamId && (int) $f->away_team_id !== $teamId) {
                continue;
            }

            if (! $f->scheduled_at) {
                continue;
            }

            $fDate = Carbon::parse($f->scheduled_at)->toDateString();
            if ($fDate === $dateStr) {
                return true; // Already has a match on the same date
            }
        }

        return false;
    }

    /**
     * Verify minimum rest rule: $|Date_{target} - Date_{match}| > restDays$.
     * E.g. restDays = 1 means adjacent calendar days are forbidden.
     */
    private function satisfiesRestRule(
        int $teamId,
        Carbon $targetDate,
        int $restDays,
        Collection $scheduledFixtures
    ): bool {
        foreach ($scheduledFixtures as $f) {
            if ((int) $f->home_team_id !== $teamId && (int) $f->away_team_id !== $teamId) {
                continue;
            }

            if (! $f->scheduled_at) {
                continue;
            }

            $fixtureDate = Carbon::parse($f->scheduled_at)->startOfDay();
            $targetDay = $targetDate->copy()->startOfDay();

            $diffInDays = abs($targetDay->diffInDays($fixtureDate, false));

            // If match is within the forbidden rest window:
            // diff == 0: same day
            // diff <= restDays: not enough rest days between matches
            if ($diffInDays <= $restDays) {
                return false;
            }
        }

        return true;
    }

    /**
     * Dispatch notifications to both team managers about confirmed league match.
     */
    private function notifyMatchAssignment(Tournament $tournament, Fixture $fixture, TerrainBooking $booking): void
    {
        $homeTeam = $fixture->homeTeam;
        $awayTeam = $fixture->awayTeam;
        $stadiumName = $booking->terrain?->name ?? 'الملعب المحدد';
        $dateStr = $booking->booking_date?->format('Y-m-d') ?? '';
        $timeStr = $booking->start_time ?? '';

        $title = 'تأكيد موعد مباراة في '.$tournament->name;
        $body = "تم جدولة مباراة {$homeTeam?->name} ضد {$awayTeam?->name} بتاريخ {$dateStr} الساعة {$timeStr} في {$stadiumName}.";

        if ($homeTeam?->manager_id) {
            NotificationService::push(
                (int) $homeTeam->manager_id,
                'match_accepted',
                $title,
                $body,
                ['tournament_id' => $tournament->id, 'fixture_id' => $fixture->id],
                "/dashboard"
            );
        }

        if ($awayTeam?->manager_id) {
            NotificationService::push(
                (int) $awayTeam->manager_id,
                'match_accepted',
                $title,
                $body,
                ['tournament_id' => $tournament->id, 'fixture_id' => $fixture->id],
                "/dashboard"
            );
        }
    }
}
