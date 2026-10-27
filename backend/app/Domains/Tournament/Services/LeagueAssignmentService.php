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
use App\Domains\Tournament\Exceptions\SchedulingWarningException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
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
            ->whereNotIn('status', [FixtureStatus::Cancelled, FixtureStatus::Postponed])
            ->get(['id', 'stadium_id', 'scheduled_at']);

        $occupiedSlots = [];
        foreach ($scheduledFixtures as $sf) {
            if ($sf->stadium_id && $sf->scheduled_at) {
                $occupiedSlots[$sf->stadium_id.'_'.$sf->scheduled_at->format('Y-m-d H:i')] = true;
            }
        }

        // Pre-fetch closures in date range
        $closures = \App\Domains\Booking\Models\TerrainSlotClosure::query()
            ->whereBetween('closure_date', [$effectiveMin->toDateString(), $endDate->toDateString()])
            ->when(! empty($allowedStadiumIds), fn ($q) => $q->whereIn('terrain_id', $allowedStadiumIds))
            ->get();

        // Pre-fetch occurrences in date range
        $occurrences = \App\Domains\Booking\Models\TerrainBookingOccurrence::query()
            ->whereBetween('occurrence_date', [$effectiveMin->toDateString(), $endDate->toDateString()])
            ->when(! empty($allowedStadiumIds), fn ($q) => $q->whereIn('stadium_id', $allowedStadiumIds))
            ->get();

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

        // 2. Weekly Recurring Subscriptions (Disabled: future feature per project requirements)
        // Weekly pitch subscriptions are postponed to a later phase and disabled from tournament fixture scheduling.

        // 3. Freed or Released Occurrences from Postponements / Tournament Releases (Disabled with subscriptions)

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

            // Find fixtures where this team is the Home OR Away team
            $candidateFixtures = $unscheduledFixtures->filter(
                fn (Fixture $f) => ((int) $f->home_team_id === $homeTeamId || (int) $f->away_team_id === $homeTeamId)
                    && $f->home_team_id !== null && $f->away_team_id !== null
            );

            foreach ($candidateFixtures as $fixture) {
                $isOwnerHome = ((int) $fixture->home_team_id === $homeTeamId);
                $opponentId = $isOwnerHome ? (int) $fixture->away_team_id : (int) $fixture->home_team_id;

                // Evaluate hard constraints with explainable messages
                $validations = [];
                $canAssign = true;

                // Rule A: Confirmed booking of a participating team
                $validations[] = [
                    'rule' => 'home_booking',
                    'label' => $isOwnerHome
                        ? 'حجز مؤكد للفريق المضيف في الملعب والوقت المحددين'
                        : 'حجز مؤكد للفريق الضيف يمكن استخدامه للمباراة',
                    'passed' => true,
                ];

                // Rule B: Fixture is pending
                $validations[] = [
                    'rule' => 'fixture_required',
                    'label' => 'المواجهة مستحقة وفقاً لجدول مباريات الدوري',
                    'passed' => true,
                ];

                // Rule C: Opponent has no hard conflict on the same datetime
                $opponentConflict = $this->hasConflictOnDateTime(
                    $opponentId,
                    $bookingDate,
                    $bookingStart,
                    $bookingEnd,
                    $scheduledMatches
                );

                if ($opponentConflict) {
                    $canAssign = false;
                    $validations[] = [
                        'rule' => 'opponent_available',
                        'label' => 'الفريق الآخر لديه مباراة أخرى في نفس التوقيت',
                        'passed' => false,
                    ];
                } else {
                    $validations[] = [
                        'rule' => 'opponent_available',
                        'label' => 'الفريق الآخر متاح ولا توجد مباريات متعارضة',
                        'passed' => true,
                    ];
                }

                // Rule D: Rest Rule (warning only, does NOT block committee override)
                $restViolations = [];
                if ($restDaysRequired > 0) {
                    $homeRestOk = $this->satisfiesRestRule(
                        (int) $fixture->home_team_id,
                        $bookingDate,
                        $restDaysRequired,
                        $scheduledMatches
                    );

                    $awayRestOk = $this->satisfiesRestRule(
                        (int) $fixture->away_team_id,
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

                $hasRestWarning = ! empty($restViolations);
                if ($hasRestWarning) {
                    $validations[] = [
                        'rule' => 'rest_rule',
                        'label' => 'فترة الراحة غير مستوفاة (يلزم '.$restDaysRequired.' يوم راحة على الأقل): '.implode('، ', $restViolations).' — يمكن للجنة تجاوز التحذير.',
                        'passed' => true,
                        'is_warning' => true,
                    ];
                } else {
                    $validations[] = [
                        'rule' => 'rest_rule',
                        'label' => 'قاعدة الراحة محققة ('.$restDaysRequired.' يوم راحة على الأقل للفريقين)',
                        'passed' => true,
                        'is_warning' => false,
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
                    'has_rest_warning' => $hasRestWarning,
                    'rest_warning' => $hasRestWarning ? 'تعارض مع فترة الراحة (يمكن فرضه)' : null,
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
        ?string $note = null,
        string $freedAction = 'freed'
    ): array {
        return DB::transaction(function () use ($tournament, $fixture, $reason, $note, $freedAction) {
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

            // Handle occurrence state based on postponement reason
            $origDateStr = $originalScheduledAt ? Carbon::parse($originalScheduledAt)->toDateString() : null;
            $origTime = $originalScheduledAt ? Carbon::parse($originalScheduledAt)->format('H:i') : null;

            $freedOccurrence = null;
            $occQuery = \App\Domains\Booking\Models\TerrainBookingOccurrence::where('fixture_id', $fixture->id);
            if ($originalScheduledAt && $fixture->stadium_id) {
                $occQuery->orWhere(function ($q) use ($fixture, $origDateStr) {
                    $q->where('stadium_id', $fixture->stadium_id)->where('occurrence_date', $origDateStr);
                });
            }
            $targetOcc = $occQuery->first();

            if (! $targetOcc && $originalScheduledAt && $fixture->stadium_id) {
                $weeklySub = TerrainBooking::query()
                    ->where('terrain_id', $fixture->stadium_id)
                    ->where('reservation_type', 'weekly_subscription')
                    ->whereIn('status', ['approved', 'confirmed'])
                    ->whereNull('archived_at')
                    ->first();

                $duration = (int) ($fixture->match?->match_duration_minutes ?? $tournament->match_duration_minutes ?? 60);

                if ($weeklySub) {
                    $targetOcc = \App\Domains\Booking\Models\TerrainBookingOccurrence::firstOrCreate(
                        [
                            'terrain_booking_id' => $weeklySub->id,
                            'occurrence_date' => $origDateStr,
                        ],
                        [
                            'stadium_id' => $fixture->stadium_id,
                            'start_time' => $origTime,
                            'end_time' => Carbon::parse($originalScheduledAt)->addMinutes($duration)->format('H:i'),
                            'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_ACTIVE,
                        ]
                    );
                }
            }

            if (in_array($reason, ['rain', 'pitch_condition'], true) && $originalScheduledAt && $fixture->stadium_id) {
                $duration = (int) ($fixture->match?->match_duration_minutes ?? $tournament->match_duration_minutes ?? 60);
                // Weather / stadium condition: occurrence stays reserved and blocked for that date (never offered for reuse or release)
                \App\Domains\Booking\Models\TerrainSlotClosure::firstOrCreate(
                    [
                        'terrain_id' => $fixture->stadium_id,
                        'closure_date' => $origDateStr,
                        'start_time' => $origTime,
                        'end_time' => Carbon::parse($originalScheduledAt)->addMinutes($duration)->format('H:i'),
                    ],
                    [
                        'reason' => 'ظروف جوية / أرضية الملعب (تأجيل مباراة)',
                    ]
                );

                if ($targetOcc) {
                    $targetOcc->update([
                        'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_WEATHER_BLOCKED,
                        'fixture_id' => null,
                        'notes' => 'تأجيل بسبب أحوال جوية / ظروف الملعب',
                    ]);
                    $freedOccurrence = $targetOcc;
                }
            } else {
                // Non-weather reasons (team circumstances, other):
                // 1: assign_pending / replace with pending match
                // 2: release to tournament teams
                // 3: keep reserved (DEFAULT)
                if ($freedAction === 'release_to_tournament') {
                    if ($targetOcc) {
                        $targetOcc->update([
                            'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_RELEASED,
                            'fixture_id' => null,
                            'metadata' => array_merge($targetOcc->metadata ?? [], [
                                'tournament_id' => $tournament->id,
                                'released_at' => now()->toDateTimeString(),
                            ]),
                            'notes' => 'متاح لفرق بطولة: '.$tournament->name,
                        ]);
                        $freedOccurrence = $targetOcc;

                        // Notify slot owner manager and tournament managers
                        $bookingOwner = $targetOcc->booking?->team;
                        if ($bookingOwner?->manager_id) {
                            NotificationService::push(
                                (int) $bookingOwner->manager_id,
                                'announcement',
                                'إتاحة موعد أسبوعي للبطولة',
                                "تمت إتاحة موعدك الأسبوعي ليوم {$origDateStr} لفرق بطولة {$tournament->name}",
                                ['tournament_id' => $tournament->id, 'occurrence_id' => $targetOcc->id],
                                '/dashboard'
                            );
                        }
                    }
                } elseif ($freedAction === 'keep_reserved') {
                    if ($targetOcc) {
                        $targetOcc->update([
                            'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_ACTIVE,
                            'fixture_id' => null,
                            'notes' => 'محجوز لصاحب الاشتراك الأسبوعي',
                        ]);
                        $freedOccurrence = $targetOcc;
                    }
                } else {
                    // Default: 'freed' -> Available to tournament pool for pending/postponed matches
                    if ($targetOcc) {
                        $targetOcc->update([
                            'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_FREED,
                            'fixture_id' => null,
                            'notes' => 'موعد تحرر بعد تأجيل مباراة',
                        ]);
                        $freedOccurrence = $targetOcc;
                    }
                }
            }

            if ($fixture->stadium_id) {
                \App\Domains\Booking\Services\SlotAvailabilityService::invalidate((int) $fixture->stadium_id, $origDateStr);
            }

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
                'freed_occurrence' => $freedOccurrence ? [
                    'id' => $freedOccurrence->id,
                    'status' => $freedOccurrence->status,
                    'date' => $origDateStr,
                    'time' => $origTime,
                    'stadium_id' => $fixture->stadium_id,
                    'can_release' => ! in_array($reason, ['rain', 'pitch_condition'], true),
                ] : null,
                'can_release' => ! in_array($reason, ['rain', 'pitch_condition'], true),
                'message' => 'تم تأجيل المباراة بنجاح، ويمكنكم إعادة جدولتها من الاقتراحات المتاحة.',
            ];
        });
    }

    /**
     * Generate suggestions for rescheduling a postponed match.
     * Scans unused future confirmed slots:
     * 1. Team A and Team B slots.
     * 2. Tournament Slot Pool (finished teams, released occurrences, non-weather postponements).
     * 3. Secondary collapsed section: teams with pending matches.
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

        // 1. Identify all registered teams and classify finished vs unfinished
        $allRegisteredTeamIds = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->pluck('team_id')
            ->all();

        $finishedTeamIds = [];
        $unfinishedTeamsData = [];

        foreach ($allRegisteredTeamIds as $tid) {
            if (in_array($tid, $involvedTeamIds, true)) {
                continue;
            }

            $unf = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->where(fn ($q) => $q->where('home_team_id', $tid)->orWhere('away_team_id', $tid))
                ->where(function ($q) {
                    $q->whereNull('scheduled_at')
                        ->orWhereIn('status', [FixtureStatus::WaitingForBooking, FixtureStatus::ReschedulingRequired, FixtureStatus::Postponed]);
                })
                ->get(['id', 'matchday', 'home_team_id', 'away_team_id']);

            if ($unf->isEmpty()) {
                $finishedTeamIds[] = $tid;
            } else {
                $unfinishedTeamsData[$tid] = [
                    'count' => $unf->count(),
                    'fixtures' => $unf,
                ];
            }
        }

        // Project available slots for all registered teams
        $slots = $this->projectAvailableSlots($tournament, $allRegisteredTeamIds, $minDate->toDateString());

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
            $occStatus = $slot['occurrence_status'] ?? null;

            // Must be today or future
            if ($slotDateTime->isPast()) {
                continue;
            }

            // Both teams must be free from overlapping matches at the exact same hour
            if ($this->hasConflictOnDateTime($teamAId, $slotDate, $slotStart, $slotEnd, $scheduledMatches)) {
                continue;
            }
            if ($this->hasConflictOnDateTime($teamBId, $slotDate, $slotStart, $slotEnd, $scheduledMatches)) {
                continue;
            }

            $satisfiesRestA = $this->satisfiesRestRule($teamAId, $slotDate, $restDaysRequired, $scheduledMatches);
            $satisfiesRestB = $this->satisfiesRestRule($teamBId, $slotDate, $restDaysRequired, $scheduledMatches);
            $hasRestWarning = (! $satisfiesRestA || ! $satisfiesRestB);

            $isOwnSlot = in_array($slotOwnerId, $involvedTeamIds, true);
            $isFinishedTeam = in_array($slotOwnerId, $finishedTeamIds, true);
            $isReleased = ($occStatus === \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_RELEASED);
            $isFreed = ($occStatus === \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_FREED);

            // Determine categorization and warnings
            $isSecondary = false;
            $warning = null;
            $sourceLabel = null;
            $poolTag = 'own';

            if ($isOwnSlot) {
                $poolTag = 'own';
                $sourceLabel = 'موعد يخص أحد الفريقين';
            } elseif ($isFinishedTeam) {
                $poolTag = 'finished_team';
                $sourceLabel = "موعد تحرر بعد انتهاء مباريات {$booking->team?->name}";
            } elseif ($isReleased) {
                $poolTag = 'released';
                $sourceLabel = "موعد متاح لفرق البطولة (صاحب الحجز: {$booking->team?->name})";
            } elseif ($isFreed) {
                $poolTag = 'postpone_freed';
                $sourceLabel = "موعد تحرر بعد تأجيل مباراة (حجز {$booking->team?->name})";
            } else {
                // Belongs to team with unfinished matches
                $isSecondary = true;
                $poolTag = 'team_pending';
                $pendingInfo = $unfinishedTeamsData[$slotOwnerId] ?? ['count' => 1];
                $sourceLabel = 'قد يحتاجها فريقها لاحقاً';
                $warning = "فريق {$booking->team?->name} لديه {$pendingInfo['count']} مباريات متبقية قد يحتاج هذا الموعد لإقامتها";
            }

            // Determine host team
            if ($isOwnSlot) {
                $newHostId = $slotOwnerId;
                $newGuestId = ($newHostId === $teamAId) ? $teamBId : $teamAId;
                $hostTeam = ($newHostId === $teamAId) ? $fixture->homeTeam : $fixture->awayTeam;
                $guestTeam = ($newGuestId === $teamAId) ? $fixture->homeTeam : $fixture->awayTeam;
                $isHostChanged = ($newHostId !== $teamAId);
            } else {
                // Borrowed slot: keep original pairing order (team A is host)
                $newHostId = $teamAId;
                $newGuestId = $teamBId;
                $hostTeam = $fixture->homeTeam;
                $guestTeam = $fixture->awayTeam;
                $isHostChanged = false;
            }

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
                'stadium_name' => $booking->terrain?->name,
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
                'is_borrowed' => ! $isOwnSlot,
                'borrowed_from_owner' => ! $isOwnSlot ? ($booking->team?->name ?? 'فريق آخر') : null,
                'is_secondary' => $isSecondary,
                'has_rest_warning' => $hasRestWarning,
                'rest_warning' => $hasRestWarning ? 'تعارض مع فترة الراحة (صلاحية فرض الموعد متاحة)' : null,
                'can_assign' => true,
                'warning' => $warning,
                'source_label' => $sourceLabel,
                'pool_tag' => $poolTag,
            ];
        }

        // Sort: chronologically nearest first (Requirement 5)
        usort($suggestions, function ($a, $b) {
            $dateCmp = strcmp($a['datetime'], $b['datetime']);
            if ($dateCmp !== 0) {
                return $dateCmp;
            }
            if ($a['is_secondary'] !== $b['is_secondary']) {
                return $a['is_secondary'] ? 1 : -1;
            }
            return 0;
        });

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

            $isBorrowed = ($slotOwnerId !== $teamAId && $slotOwnerId !== $teamBId);

            if ($isBorrowed) {
                // Borrowed slot from tournament pool: keep original pairing
                $newHomeId = $teamAId;
                $newAwayId = $teamBId;
                $notes = 'توقيت مستعار من حجز فريق '.($booking->team?->name ?? 'آخر');
            } else {
                // Slot owner is host team
                $newHomeId = $slotOwnerId;
                $newAwayId = ($newHomeId === $teamAId) ? $teamBId : $teamAId;
                $notes = null;
            }

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
                    'notes' => $notes,
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
                    'notes' => $notes,
                ]);
            }

            // Free any previous occurrence / booking previously occupied by this fixture so the former slot is released
            \App\Domains\Booking\Models\TerrainBookingOccurrence::query()
                ->where('fixture_id', $fixture->id)
                ->where('status', \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_USED_BY_MATCH)
                ->update([
                    'fixture_id' => null,
                    'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_FREED,
                ]);

            \App\Domains\Booking\Models\TerrainBooking::query()
                ->where('fixture_id', $fixture->id)
                ->where('id', '!=', $booking->id)
                ->update(['fixture_id' => null]);

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

            // Link booking
            if ($booking->isWeeklySubscription()) {
                \App\Domains\Booking\Models\TerrainBookingOccurrence::updateOrCreate(
                    [
                        'terrain_booking_id' => $booking->id,
                        'occurrence_date' => $dateStr,
                    ],
                    [
                        'stadium_id' => $booking->terrain_id,
                        'start_time' => $booking->start_time,
                        'end_time' => $booking->end_time,
                        'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_USED_BY_MATCH,
                        'fixture_id' => $fixture->id,
                        'notes' => 'مباراة دوري: '.$tournament->name.($isBorrowed ? ' (موعد مستعار)' : ''),
                    ]
                );
            } else {
                $booking->update([
                    'fixture_id' => $fixture->id,
                ]);
            }

            \App\Domains\Booking\Services\SlotAvailabilityService::invalidate((int) $booking->terrain_id, $dateStr);

            // Re-sync league week numbers dynamically
            $fixtureService = $this->fixtureService ?? app(TournamentFixtureService::class);
            $fixtureService->syncLeagueMatchdays($tournament);

            // If borrowed, notify slot owner manager and stadium manager
            if ($isBorrowed && $booking->team?->manager_id) {
                NotificationService::push(
                    (int) $booking->team->manager_id,
                    'announcement',
                    'استخدام موعدك لمباراة دوري',
                    "تم استخدام موعدك الأسبوعي لتاريخ {$dateStr} الساعة {$booking->start_time} لإقامة مباراة دوري ({$tournament->name})",
                    ['tournament_id' => $tournament->id, 'fixture_id' => $fixture->id],
                    '/dashboard'
                );
            }

            // Notify both teams
            $this->notifyMatchAssignment($tournament, $fixture, $booking);

            return [
                'fixture' => $fixture->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']),
                'message' => 'تمت إعادة جدولة وتثبيت المباراة بنجاح'.($isBorrowed ? ' (موعد مستعار من حجز '.$booking->team?->name.')' : '.'),
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
        } else {
            \App\Domains\Booking\Models\TerrainBookingOccurrence::updateOrCreate(
                [
                    'terrain_booking_id' => $booking->id,
                    'occurrence_date' => Carbon::parse($scheduledAt)->toDateString(),
                ],
                [
                    'stadium_id' => $slot['terrain_id'],
                    'start_time' => $booking->start_time,
                    'end_time' => $booking->end_time,
                    'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_USED_BY_MATCH,
                    'fixture_id' => $fixture->id,
                    'notes' => 'مباراة دوري: '.$tournament->name,
                ]
            );
        }

        \App\Domains\Booking\Services\SlotAvailabilityService::invalidate((int) $slot['terrain_id']);

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

            $hasRestWarning = false;
            $restWarnings = [];

            // 2. Check Candidate Team C at Fixture 1 date (if scheduled)
            if ($fixtureScheduledAt && $isEligible) {
                $restOk = $this->satisfiesRestRule($candidateId, $fixtureScheduledAt, $restDaysRequired, $activeMatches);
                if (! $restOk) {
                    $hasRestWarning = true;
                    $restWarnings[] = 'تعارض مع فترة الراحة الإلزامية للفريق في موعد هذه المباراة (يمكن للجنة التجاوز)';
                }

                $fDuration = (int) ($fixture->match?->match_duration_minutes ?? $tournament->match_duration_minutes ?? 60);
                $conflict = $this->hasConflictOnDateTime(
                    $candidateId,
                    $fixtureScheduledAt,
                    $fixtureScheduledAt->format('H:i'),
                    $fixtureScheduledAt->copy()->addMinutes($fDuration)->format('H:i'),
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
                    $hasRestWarning = true;
                    $restWarnings[] = 'الخصم الحالي لديه تعارض مع فترة الراحة في موعد المواجهة البديلة (يمكن للجنة التجاوز)';
                }

                $oDuration = (int) ($otherFixture->match?->match_duration_minutes ?? $tournament->match_duration_minutes ?? 60);
                $bConflict = $this->hasConflictOnDateTime(
                    $currentOpponentId,
                    $otherScheduledAt,
                    $otherScheduledAt->format('H:i'),
                    $otherScheduledAt->copy()->addMinutes($oDuration)->format('H:i'),
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
                'has_rest_warning' => $hasRestWarning,
                'rest_warnings' => $restWarnings,
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
    public function changeOpponent(Tournament $tournament, Fixture $fixture, int $newOpponentId, bool $overrideWarnings = false): array
    {
        return DB::transaction(function () use ($tournament, $fixture, $newOpponentId, $overrideWarnings) {
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
                if (! $restOk && ! $overrideWarnings) {
                    $newTeam = \App\Domains\Team\Models\Team::find($newOpponentId);
                    throw new SchedulingWarningException(
                        'الفريق الجديد ('.($newTeam?->name ?? '').') لديه تعارض مع قاعدة فترة الراحة الإلزامية في موعد هذه المباراة',
                        'rest_rule_conflict',
                        'تعارض فترة الراحة للفريق الجديد',
                        $newTeam?->name
                    );
                }

                $fDuration = (int) ($fixture->match?->match_duration_minutes ?? $tournament->match_duration_minutes ?? 60);
                $conflict = $this->hasConflictOnDateTime(
                    $newOpponentId,
                    $targetDate,
                    $targetDate->format('H:i'),
                    $targetDate->copy()->addMinutes($fDuration)->format('H:i'),
                    $scheduledMatches
                );
                if ($conflict && ! $overrideWarnings) {
                    $newTeam = \App\Domains\Team\Models\Team::find($newOpponentId);
                    throw new SchedulingWarningException(
                        'الفريق الجديد ('.($newTeam?->name ?? '').') لديه مباراة أخرى مبرمجة في نفس التوقيت',
                        'team_match_conflict',
                        'تعارض توقيت المباراة للفريق الجديد',
                        $newTeam?->name
                    );
                }
            }

            // 2. Verify rest rule and time conflict for old opponent in Other Fixture (if scheduled)
            if ($otherFixture && $otherFixture->scheduled_at) {
                $otherTargetDate = Carbon::parse($otherFixture->scheduled_at);

                $oldRestOk = $this->satisfiesRestRule($oldOpponentId, $otherTargetDate, $restDaysRequired, $scheduledMatches);
                if (! $oldRestOk && ! $overrideWarnings) {
                    $oldTeam = \App\Domains\Team\Models\Team::find($oldOpponentId);
                    throw new SchedulingWarningException(
                        'الفريق الخصم السابق ('.($oldTeam?->name ?? '').') لديه تعارض مع قاعدة فترة الراحة الإلزامية في موعد المواجهة البديلة',
                        'rest_rule_conflict',
                        'تعارض فترة الراحة للخصم السابق',
                        $oldTeam?->name
                    );
                }

                $oDuration = (int) ($otherFixture->match?->match_duration_minutes ?? $tournament->match_duration_minutes ?? 60);
                $oldConflict = $this->hasConflictOnDateTime(
                    $oldOpponentId,
                    $otherTargetDate,
                    $otherTargetDate->format('H:i'),
                    $otherTargetDate->copy()->addMinutes($oDuration)->format('H:i'),
                    $scheduledMatches
                );
                if ($oldConflict && ! $overrideWarnings) {
                    $oldTeam = \App\Domains\Team\Models\Team::find($oldOpponentId);
                    throw new SchedulingWarningException(
                        'الفريق الخصم السابق ('.($oldTeam?->name ?? '').') لديه مباراة أخرى مبرمجة في توقيت المواجهة البديلة',
                        'team_match_conflict',
                        'تعارض توقيت المباراة للخصم السابق',
                        $oldTeam?->name
                    );
                }
            }

            if ($overrideWarnings) {
                MatchResultAudit::create([
                    'fixture_id' => $fixture->id,
                    'match_id' => $fixture->match_id,
                    'user_id' => auth()->id(),
                    'action' => 'scheduling_override',
                    'description' => 'تجاوز تحذير الجدولة وتغيير الخصم بقرار من اللجنة المنظمة',
                    'changes' => [
                        'new_opponent_id' => $newOpponentId,
                        'old_opponent_id' => $oldOpponentId,
                    ],
                ]);
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
            $isAwayBooking = ((int) $booking->team_id === (int) $fixture->away_team_id);
            if (! $isHomeBooking && ! $isAwayBooking && ! $allowBorrowed) {
                throw new DomainException('الحجز يجب أن يكون تابعاً لأحد الفريقين المتباريين (أو تفعيل خيار استعارة توقيت)');
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
            if (! $isHomeBooking && ! $isAwayBooking) {
                $notes = 'توقيت مستعار من فريق '.($booking->team?->name ?? 'آخر');
            } elseif ($isAwayBooking) {
                $notes = 'حجز تابع لفريق '.$booking->team?->name;
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
            } else {
                \App\Domains\Booking\Models\TerrainBookingOccurrence::updateOrCreate(
                    [
                        'terrain_booking_id' => $booking->id,
                        'occurrence_date' => $bookingDateStr,
                    ],
                    [
                        'stadium_id' => $booking->terrain_id,
                        'start_time' => $booking->start_time,
                        'end_time' => $booking->end_time,
                        'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_USED_BY_MATCH,
                        'fixture_id' => $fixture->id,
                        'notes' => 'مباراة دوري: '.$tournament->name,
                    ]
                );
            }

            \App\Domains\Booking\Services\SlotAvailabilityService::invalidate((int) $booking->terrain_id, $bookingDateStr);

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
    public function satisfiesRestRule(
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

    /**
     * Step 2.3: Explicitly release a single occurrence to tournament teams.
     */
    public function releaseOccurrence(Tournament $tournament, \App\Domains\Booking\Models\TerrainBookingOccurrence $occurrence): array
    {
        return DB::transaction(function () use ($tournament, $occurrence) {
            if ($occurrence->fixture_id) {
                throw new DomainException('لا يمكن إتاحة موعد مستخدم بالفعل لمباراة مبرمجة');
            }
            if ($occurrence->status === \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_WEATHER_BLOCKED) {
                throw new DomainException('لا يمكن إتاحة موعد محظور بسبب الأحوال الجوية');
            }

            $origDateStr = $occurrence->occurrence_date?->toDateString();

            $occurrence->update([
                'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_RELEASED,
                'metadata' => array_merge($occurrence->metadata ?? [], [
                    'tournament_id' => $tournament->id,
                    'released_at' => now()->toDateTimeString(),
                ]),
                'notes' => 'متاح لفرق بطولة: '.$tournament->name,
            ]);

            \App\Domains\Booking\Services\SlotAvailabilityService::invalidate((int) $occurrence->stadium_id, $origDateStr);

            // Notify slot owner manager
            $ownerTeam = $occurrence->booking?->team;
            if ($ownerTeam?->manager_id) {
                NotificationService::push(
                    (int) $ownerTeam->manager_id,
                    'announcement',
                    'إتاحة موعدك الأسبوعي للبطولة',
                    "تمت إتاحة موعدك الأسبوعي بتاريخ {$origDateStr} الساعة {$occurrence->start_time} لفرق بطولة {$tournament->name}",
                    ['tournament_id' => $tournament->id, 'occurrence_id' => $occurrence->id],
                    '/dashboard'
                );
            }

            // Notify tournament registered team managers
            $registeredTeams = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('status', TournamentTeam::STATUS_REGISTERED)
                ->with('team')
                ->get();

            foreach ($registeredTeams as $tt) {
                if ($tt->team?->manager_id && (int) $tt->team_id !== (int) $occurrence->booking?->team_id) {
                    NotificationService::push(
                        (int) $tt->team->manager_id,
                        'announcement',
                        'موعد متاح جديد في البطولة',
                        "تمت إتاحة موعد شاغر بتاريخ {$origDateStr} الساعة {$occurrence->start_time} في {$occurrence->stadium?->name} لفرق البطولة",
                        ['tournament_id' => $tournament->id, 'occurrence_id' => $occurrence->id],
                        '/dashboard'
                    );
                }
            }

            return [
                'occurrence' => $occurrence->fresh(['stadium', 'booking.team']),
                'message' => 'تمت إتاحة الموعد لفرق البطولة بنجاح.',
            ];
        });
    }

    /**
     * Step 2.3 & 3.5: Organizer action "استرجاع الموعد" before it is booked or played.
     */
    public function reclaimOccurrence(Tournament $tournament, \App\Domains\Booking\Models\TerrainBookingOccurrence $occurrence): array
    {
        return DB::transaction(function () use ($tournament, $occurrence) {
            $origDateStr = $occurrence->occurrence_date?->toDateString();

            // If occurrence is linked to an unplayed fixture, unlink it and return fixture to waiting
            if ($occurrence->fixture_id) {
                $fixture = Fixture::find($occurrence->fixture_id);
                if ($fixture) {
                    if ($fixture->match && $fixture->match->status === MatchStatus::Finished) {
                        throw new DomainException('لا يمكن استرجاع موعد مباراة مكتملة وملعوبة');
                    }
                    $fixture->update([
                        'scheduled_at' => null,
                        'stadium_id' => null,
                        'status' => FixtureStatus::ReschedulingRequired,
                        'unscheduled_reason' => 'تم استرجاع الموعد لصاحبه الأصلي',
                    ]);
                    if ($fixture->match) {
                        $fixture->match->update([
                            'status' => MatchStatus::Cancelled,
                            'active_reservation_id' => null,
                            'stadium_id' => null,
                        ]);
                    }
                }
            }

            $meta = $occurrence->metadata ?? [];
            unset($meta['tournament_id'], $meta['released_at']);

            $occurrence->update([
                'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_ACTIVE,
                'fixture_id' => null,
                'metadata' => $meta,
                'notes' => 'تم استرجاع الموعد لصاحبه الأصلي',
            ]);

            \App\Domains\Booking\Services\SlotAvailabilityService::invalidate((int) $occurrence->stadium_id, $origDateStr);

            // Notify owner
            $ownerTeam = $occurrence->booking?->team;
            if ($ownerTeam?->manager_id) {
                NotificationService::push(
                    (int) $ownerTeam->manager_id,
                    'announcement',
                    'استرجاع موعدك الأسبوعي',
                    "تم استرجاع موعدك الأسبوعي بتاريخ {$origDateStr} الساعة {$occurrence->start_time} وأصبح محجوزاً لك",
                    ['tournament_id' => $tournament->id, 'occurrence_id' => $occurrence->id],
                    '/dashboard'
                );
            }

            return [
                'occurrence' => $occurrence->fresh(['stadium', 'booking.team']),
                'message' => 'تم استرجاع الموعد لصاحبه الأصلي بنجاح.',
            ];
        });
    }

    /**
     * Step 2.1: One-tap action "نقل إلى موعد أحد الفريقين".
     * Moves a borrowed match to an unused slot belonging to one of its two teams,
     * removes the borrowed label, and returns the previously used slot to the pool.
     */
    public function moveToOwnSlot(
        Tournament $tournament,
        Fixture $fixture,
        int $newBookingId,
        ?string $newSlotDate = null
    ): array {
        return DB::transaction(function () use ($tournament, $fixture, $newBookingId, $newSlotDate) {
            $eligibility = app(LeagueEligibilityEngineService::class);
            $eligibility->assertNotLockedOrFinished($fixture);

            $teamAId = (int) $fixture->home_team_id;
            $teamBId = (int) $fixture->away_team_id;

            $newBooking = TerrainBooking::with(['terrain', 'team'])->findOrFail($newBookingId);
            $slotOwnerId = (int) $newBooking->team_id;

            if ($slotOwnerId !== $teamAId && $slotOwnerId !== $teamBId) {
                throw new DomainException('الموعد المختار لا يتبع لأي من فريقي المباراة');
            }

            $dateStr = $newSlotDate ?: ($newBooking->booking_date?->toDateString() ?: Carbon::today()->toDateString());
            $scheduledAt = Carbon::parse($dateStr.' '.$newBooking->start_time);

            // 1. Return previous slot to pool
            $prevOcc = \App\Domains\Booking\Models\TerrainBookingOccurrence::where('fixture_id', $fixture->id)->first();
            if ($prevOcc) {
                $prevOcc->update([
                    'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_FREED,
                    'fixture_id' => null,
                    'notes' => 'تم تحرير الموعد بعد نقل المباراة إلى موعد أحد الفريقين',
                ]);
                \App\Domains\Booking\Services\SlotAvailabilityService::invalidate((int) $prevOcc->stadium_id, $prevOcc->occurrence_date?->toDateString());
            }

            $prevBooking = TerrainBooking::where('fixture_id', $fixture->id)->where('id', '!=', $newBooking->id)->first();
            if ($prevBooking && ! $prevBooking->isWeeklySubscription()) {
                $prevBooking->update(['fixture_id' => null]);
                \App\Domains\Booking\Services\SlotAvailabilityService::invalidate((int) $prevBooking->terrain_id, $prevBooking->booking_date?->toDateString());
            }

            // 2. Assign slot owner as host
            $newHomeId = $slotOwnerId;
            $newAwayId = ($newHomeId === $teamAId) ? $teamBId : $teamAId;

            // 3. Clear borrowed note from match
            $match = $fixture->match;
            if ($match) {
                $cleanNotes = $match->notes ? preg_replace('/(توقيت|موعد)\s+مستعار[^\n\r]*/u', '', $match->notes) : null;
                $cleanNotes = trim((string) $cleanNotes) ?: null;

                $match->update([
                    'home_team_id' => $newHomeId,
                    'away_team_id' => $newAwayId,
                    'stadium_id' => $newBooking->terrain_id,
                    'active_reservation_id' => $newBooking->id,
                    'notes' => $cleanNotes,
                    'status' => MatchStatus::Scheduled,
                    'is_confirmed' => true,
                ]);
            }

            $fixture->update([
                'home_team_id' => $newHomeId,
                'away_team_id' => $newAwayId,
                'stadium_id' => $newBooking->terrain_id,
                'scheduled_at' => $scheduledAt,
                'status' => FixtureStatus::Scheduled,
                'unscheduled_reason' => null,
            ]);

            // 4. Link new booking
            if ($newBooking->isWeeklySubscription()) {
                \App\Domains\Booking\Models\TerrainBookingOccurrence::updateOrCreate(
                    [
                        'terrain_booking_id' => $newBooking->id,
                        'occurrence_date' => $dateStr,
                    ],
                    [
                        'stadium_id' => $newBooking->terrain_id,
                        'start_time' => $newBooking->start_time,
                        'end_time' => $newBooking->end_time,
                        'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_USED_BY_MATCH,
                        'fixture_id' => $fixture->id,
                        'notes' => 'مباراة دوري: '.$tournament->name,
                    ]
                );
            } else {
                $newBooking->update(['fixture_id' => $fixture->id]);
            }

            \App\Domains\Booking\Services\SlotAvailabilityService::invalidate((int) $newBooking->terrain_id, $dateStr);

            $this->notifyMatchAssignment($tournament, $fixture, $newBooking);

            return [
                'fixture' => $fixture->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']),
                'message' => 'تم نقل المباراة إلى موعد '.$newBooking->team?->name.' بنجاح وإعادة الموعد السابق للمجموعة.',
            ];
        });
    }

    /**
     * Step 3.1 & 3.2: Comprehensive slot pool for pending/postponed matches.
     * Default list:
     * (a) Weekly occurrences of teams that have finished all league matches
     * (b) Explicitly released occurrences
     * (c) Non-weather postponement freed occurrences
     * Secondary collapsed list:
     * (d) Unused occurrences of teams with pending matches (warning displayed)
     */
    public function unusedSlotPool(Tournament $tournament, ?Fixture $fixture = null): array
    {
        // 1. Identify finished vs unfinished teams
        $allRegisteredTeams = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->with('team')
            ->get();

        $allRegisteredTeamIds = $allRegisteredTeams->pluck('team_id')->all();

        $finishedTeamIds = [];
        $unfinishedTeamsData = [];

        foreach ($allRegisteredTeams as $tt) {
            $tid = (int) $tt->team_id;
            $unf = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->where(fn ($q) => $q->where('home_team_id', $tid)->orWhere('away_team_id', $tid))
                ->where(function ($q) {
                    $q->whereNull('scheduled_at')
                        ->orWhereIn('status', [FixtureStatus::WaitingForBooking, FixtureStatus::ReschedulingRequired, FixtureStatus::Postponed]);
                })
                ->get(['id', 'matchday', 'home_team_id', 'away_team_id']);

            if ($unf->isEmpty()) {
                $finishedTeamIds[] = $tid;
            } else {
                $unfinishedTeamsData[$tid] = [
                    'count' => $unf->count(),
                    'team_name' => $tt->team?->name,
                ];
            }
        }

        $minDate = Carbon::today()->toDateString();
        $slots = $this->projectAvailableSlots($tournament, $allRegisteredTeamIds, $minDate);

        // Pre-fetch scheduled fixtures for rest/conflict checks
        $scheduledMatches = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->when($fixture, fn ($q) => $q->where('id', '!=', $fixture->id))
            ->whereNotNull('scheduled_at')
            ->whereNotIn('status', [FixtureStatus::Cancelled, FixtureStatus::Postponed])
            ->get(['id', 'home_team_id', 'away_team_id', 'scheduled_at']);

        $restDaysRequired = (int) ($tournament->rest_days_minimum ?? 1);

        $postponedFixtures = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('status', FixtureStatus::Postponed)
            ->whereNotNull('postponed_from_date')
            ->get();

        $pendingFixtures = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where(function ($q) {
                $q->whereNull('scheduled_at')
                    ->orWhereIn('status', [
                        FixtureStatus::WaitingForBooking,
                        FixtureStatus::ReschedulingRequired,
                        FixtureStatus::Postponed,
                    ]);
            })
            ->with(['homeTeam', 'awayTeam'])
            ->get();

        $futureScheduledFixtures = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->whereNotNull('scheduled_at')
            ->whereNotIn('status', [FixtureStatus::Cancelled, FixtureStatus::Postponed])
            ->whereHas('match', fn ($q) => $q->whereNotIn('status', [MatchStatus::Finished->value, ...MatchStatus::live()]))
            ->with(['homeTeam', 'awayTeam', 'match'])
            ->orderBy('scheduled_at')
            ->get();

        $defaultPool = [];
        $secondaryPool = [];

        $teamAId = $fixture ? (int) $fixture->home_team_id : null;
        $teamBId = $fixture ? (int) $fixture->away_team_id : null;

        foreach ($slots as $slot) {
            $booking = $slot['booking'];
            $slotOwnerId = (int) $slot['owner_team_id'];
            $slotDate = $slot['date'];
            $slotStart = $slot['start_time'];
            $slotEnd = $slot['end_time'];
            $slotDateTime = $slot['datetime'];
            $occStatus = $slot['occurrence_status'] ?? null;

            // Optional fixture eligibility check
            $canAssign = true;
            $ineligibilityReasons = [];
            $hasRestWarning = false;
            $restWarnings = [];

            if ($teamAId && $teamBId) {
                if ($this->hasConflictOnDateTime($teamAId, $slotDate, $slotStart, $slotEnd, $scheduledMatches)) {
                    $canAssign = false;
                    $ineligibilityReasons[] = 'تعارض في موعد مباراة أخرى للفريق الأول';
                }
                if ($this->hasConflictOnDateTime($teamBId, $slotDate, $slotStart, $slotEnd, $scheduledMatches)) {
                    $canAssign = false;
                    $ineligibilityReasons[] = 'تعارض في موعد مباراة أخرى للفريق الثاني';
                }
                if (! $this->satisfiesRestRule($teamAId, $slotDate, $restDaysRequired, $scheduledMatches)) {
                    $hasRestWarning = true;
                    $restWarnings[] = 'عدم استيفاء فترة الراحة الإلزامية للفريق الأول (يمكن للجنة التجاوز)';
                }
                if (! $this->satisfiesRestRule($teamBId, $slotDate, $restDaysRequired, $scheduledMatches)) {
                    $hasRestWarning = true;
                    $restWarnings[] = 'عدم استيفاء فترة الراحة الإلزامية للفريق الثاني (يمكن للجنة التجاوز)';
                }
            }

            // Find all pending fixtures eligible to use this slot
            $eligibleFixtures = [];
            foreach ($pendingFixtures as $pf) {
                $hId = (int) $pf->home_team_id;
                $aId = (int) $pf->away_team_id;

                $hConflict = $this->hasConflictOnDateTime($hId, $slotDate, $slotStart, $slotEnd, $scheduledMatches);
                $aConflict = $this->hasConflictOnDateTime($aId, $slotDate, $slotStart, $slotEnd, $scheduledMatches);
                $hRest = $this->satisfiesRestRule($hId, $slotDate, $restDaysRequired, $scheduledMatches);
                $aRest = $this->satisfiesRestRule($aId, $slotDate, $restDaysRequired, $scheduledMatches);

                if (! $hConflict && ! $aConflict) {
                    $hasRestWarning = (! $hRest || ! $aRest);
                    $isOwner = ($hId === $slotOwnerId || $aId === $slotOwnerId);
                    $eligibleFixtures[] = [
                        'id' => $pf->id,
                        'matchday' => $pf->matchday,
                        'status' => $pf->status instanceof FixtureStatus ? $pf->status->value : $pf->status,
                        'home_team' => [
                            'id' => $pf->homeTeam?->id,
                            'name' => $pf->homeTeam?->name,
                            'logo_url' => $pf->homeTeam?->logo_url,
                        ],
                        'away_team' => [
                            'id' => $pf->awayTeam?->id,
                            'name' => $pf->awayTeam?->name,
                            'logo_url' => $pf->awayTeam?->logo_url,
                        ],
                        'is_owner_involved' => $isOwner,
                        'has_rest_warning' => $hasRestWarning,
                        'rest_warning' => $hasRestWarning ? 'تعارض مع فترة الراحة (يمكن فرضه)' : null,
                        'borrowed_label' => $isOwner ? null : "موعد مستعار من {$booking->team?->name}",
                    ];
                }
            }

            // Find future matches that could be advanced into this earlier vacant slot (Requirement 8)
            $advancementCandidates = [];
            foreach ($futureScheduledFixtures as $ff) {
                // Must be currently scheduled AFTER this vacant slot's datetime
                if ($ff->scheduled_at->lte($slotDateTime)) {
                    continue;
                }

                $hId = (int) $ff->home_team_id;
                $aId = (int) $ff->away_team_id;

                // Check hard conflicts excluding this match itself
                $schedWithoutThis = $scheduledMatches->filter(fn ($m) => (int) $m->id !== (int) $ff->id);
                $hConflict = $this->hasConflictOnDateTime($hId, $slotDate, $slotStart, $slotEnd, $schedWithoutThis);
                $aConflict = $this->hasConflictOnDateTime($aId, $slotDate, $slotStart, $slotEnd, $schedWithoutThis);

                if (! $hConflict && ! $aConflict) {
                    $hRest = $this->satisfiesRestRule($hId, $slotDate, $restDaysRequired, $schedWithoutThis);
                    $aRest = $this->satisfiesRestRule($aId, $slotDate, $restDaysRequired, $schedWithoutThis);
                    $hasRestWarning = (! $hRest || ! $aRest);

                    $restViolations = [];
                    if (! $hRest) {
                        $restViolations[] = ($ff->homeTeam?->name ?? 'المضيف');
                    }
                    if (! $aRest) {
                        $restViolations[] = ($ff->awayTeam?->name ?? 'الضيف');
                    }

                    $isOwner = ($hId === $slotOwnerId || $aId === $slotOwnerId);
                    $daysSaved = (int) $slotDateTime->diffInDays($ff->scheduled_at);

                    $advancementCandidates[] = [
                        'id' => $ff->id,
                        'matchday' => $ff->matchday,
                        'status' => $ff->status instanceof FixtureStatus ? $ff->status->value : $ff->status,
                        'home_team' => [
                            'id' => $ff->homeTeam?->id,
                            'name' => $ff->homeTeam?->name,
                            'logo_url' => $ff->homeTeam?->logo_url,
                        ],
                        'away_team' => [
                            'id' => $ff->awayTeam?->id,
                            'name' => $ff->awayTeam?->name,
                            'logo_url' => $ff->awayTeam?->logo_url,
                        ],
                        'current_scheduled_at' => $ff->scheduled_at->toDateTimeString(),
                        'current_date' => $ff->scheduled_at->toDateString(),
                        'current_time' => $ff->scheduled_at->format('H:i'),
                        'proposed_date' => $slot['date_str'],
                        'proposed_time' => $slotStart.' - '.$slotEnd,
                        'days_saved' => $daysSaved,
                        'is_owner_involved' => $isOwner,
                        'has_rest_warning' => $hasRestWarning,
                        'rest_warning' => $hasRestWarning
                            ? 'تعارض مع فترة الراحة ('.implode(' و ', $restViolations).') — يمكن للجنة تجاوز التحذير'
                            : null,
                        'borrowed_label' => $isOwner ? null : "موعد مستعار من {$booking->team?->name}",
                        'can_advance' => true,
                    ];
                }
            }

            usort($advancementCandidates, function ($a, $b) {
                if ($a['is_owner_involved'] !== $b['is_owner_involved']) {
                    return $a['is_owner_involved'] ? -1 : 1;
                }
                if ($a['days_saved'] !== $b['days_saved']) {
                    return $b['days_saved'] <=> $a['days_saved'];
                }
                return strcmp($a['current_scheduled_at'], $b['current_scheduled_at']);
            });

            $isFinishedTeam = in_array($slotOwnerId, $finishedTeamIds, true);
            $isReleased = ($occStatus === \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_RELEASED);
            $isFreed = ($occStatus === \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_FREED);

            $matchingPostponed = $postponedFixtures->first(function ($pf) use ($slot) {
                $pfDateStr = $pf->postponed_from_date ? Carbon::parse($pf->postponed_from_date)->toDateString() : null;
                return $pfDateStr === $slot['date_str'] && (int) $pf->stadium_id === (int) $slot['terrain_id'];
            });

            $slotItem = [
                'id' => "pool_slot_{$booking->id}_{$slot['date_str']}",
                'booking_id' => $booking->id,
                'date' => $slot['date_str'],
                'day_name' => $slotDate->translatedFormat('l'),
                'time' => $slotStart.' - '.$slotEnd,
                'start_time' => $slotStart,
                'end_time' => $slotEnd,
                'datetime' => $slotDateTime->toDateTimeString(),
                'owner_team_id' => $slotOwnerId,
                'owner_team_name' => $booking->team?->name,
                'owner_team_logo' => $booking->team?->logo_url,
                'stadium' => $booking->terrain ? [
                    'id' => $booking->terrain->id,
                    'name' => $booking->terrain->name,
                    'city' => $booking->terrain->city,
                ] : null,
                'stadium_name' => $booking->terrain?->name,
                'is_weekly' => $slot['is_weekly'],
                'can_assign' => $canAssign,
                'has_rest_warning' => $hasRestWarning,
                'rest_warnings' => $restWarnings,
                'ineligibility_reasons' => $ineligibilityReasons,
                'eligible_fixtures' => $eligibleFixtures,
                'advancement_candidates' => $advancementCandidates,
            ];

            if ($matchingPostponed || $isFreed) {
                $slotItem['pool_tag'] = 'postpone_freed';
                $slotItem['source_label'] = $matchingPostponed 
                    ? "موعد تحرر بعد تأجيل مباراة الجولة {$matchingPostponed->matchday} ({$booking->team?->name})"
                    : "موعد تحرر بعد تأجيل مباراة (حجز {$booking->team?->name})";
                $defaultPool[] = $slotItem;
            } elseif ($isReleased) {
                $slotItem['pool_tag'] = 'released';
                $slotItem['source_label'] = "موعد متاح لفرق البطولة (صاحب الحجز: {$booking->team?->name})";
                $defaultPool[] = $slotItem;
            } elseif ($isFinishedTeam) {
                $slotItem['pool_tag'] = 'finished_team';
                $slotItem['source_label'] = "موعد شاغر متاح للبطولة (حجز {$booking->team?->name})";
                $defaultPool[] = $slotItem;
            } else {
                // Secondary pool: team has pending matches
                $unfData = $unfinishedTeamsData[$slotOwnerId] ?? ['count' => 1];
                $slotItem['pool_tag'] = 'team_pending';
                $slotItem['source_label'] = 'قد يحتاجها فريقها لاحقاً';
                $slotItem['warning'] = "فريق {$booking->team?->name} لديه {$unfData['count']} مباريات متبقية قد يحتاج هذا الموعد لإقامتها";
                $secondaryPool[] = $slotItem;
            }
        }

        // Sort both pools by earliest date
        usort($defaultPool, fn ($a, $b) => strcmp($a['datetime'], $b['datetime']));
        usort($secondaryPool, fn ($a, $b) => strcmp($a['datetime'], $b['datetime']));

        return [
            'default_pool' => $defaultPool,
            'secondary_pool' => $secondaryPool,
            'finished_teams' => $allRegisteredTeams->filter(fn ($t) => in_array($t->team_id, $finishedTeamIds, true))->values(),
        ];
    }

    /**
     * Advance a future scheduled match into an earlier vacant booking slot (Requirement 8).
     * Releases the match's previous occurrence/booking so it becomes available.
     *
     * @return array<string, mixed>
     */
    public function advanceMatch(
        Tournament $tournament,
        Fixture $fixture,
        int $bookingId,
        string $dateStr,
        bool $overrideWarnings = false,
        ?string $overrideReason = null
    ): array {
        return DB::transaction(function () use ($tournament, $fixture, $bookingId, $dateStr, $overrideWarnings, $overrideReason) {
            $eligibility = app(LeagueEligibilityEngineService::class);
            $eligibility->assertNotLockedOrFinished($fixture);

            $booking = TerrainBooking::with(['terrain', 'team'])->findOrFail($bookingId);
            $slotOwnerId = (int) $booking->team_id;

            $teamAId = (int) $fixture->home_team_id;
            $teamBId = (int) $fixture->away_team_id;

            $isBorrowed = ($slotOwnerId !== $teamAId && $slotOwnerId !== $teamBId);

            // Determine host team: if one of the teams owns the slot, they become host
            if ($slotOwnerId === $teamAId || $slotOwnerId === $teamBId) {
                $newHomeId = $slotOwnerId;
                $newAwayId = ($newHomeId === $teamAId) ? $teamBId : $teamAId;
            } else {
                $newHomeId = $teamAId;
                $newAwayId = $teamBId;
            }

            $notes = $isBorrowed ? 'توقيت مستعار من حجز فريق '.($booking->team?->name ?? 'آخر') : null;
            $scheduledAt = Carbon::parse($dateStr.' '.$booking->start_time);

            // Hard constraints check
            $scheduledMatches = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->where('id', '!=', $fixture->id)
                ->whereNotNull('scheduled_at')
                ->whereNotIn('status', [FixtureStatus::Cancelled, FixtureStatus::Postponed])
                ->get(['id', 'home_team_id', 'away_team_id', 'scheduled_at']);

            $slotDate = Carbon::parse($dateStr);
            if ($this->hasConflictOnDateTime($newHomeId, $slotDate, $booking->start_time, $booking->end_time, $scheduledMatches)) {
                throw new DomainException('الفريق المضيف لديه مباراة أخرى في نفس هذا التوقيت');
            }
            if ($this->hasConflictOnDateTime($newAwayId, $slotDate, $booking->start_time, $booking->end_time, $scheduledMatches)) {
                throw new DomainException('الفريق الضيف لديه مباراة أخرى في نفس هذا التوقيت');
            }

            // Rest rule check
            $restDaysRequired = (int) ($tournament->rest_days_minimum ?? 1);
            $homeRest = $this->satisfiesRestRule($newHomeId, $slotDate, $restDaysRequired, $scheduledMatches);
            $awayRest = $this->satisfiesRestRule($newAwayId, $slotDate, $restDaysRequired, $scheduledMatches);

            if ((! $homeRest || ! $awayRest) && ! $overrideWarnings) {
                $violations = [];
                if (! $homeRest) $violations[] = 'الفريق المضيف';
                if (! $awayRest) $violations[] = 'الفريق الضيف';
                throw new \App\Domains\Tournament\Exceptions\SchedulingWarningException(
                    'تعارض مع فترة الراحة الإلزامية ('.implode(' و ', $violations).'). يمكنك المتابعة بتأكيد اللجنة.',
                    'rest_period_warning',
                    'تحذير فترة الراحة المقررة'
                );
            }

            // Calculate days saved
            $daysSaved = 0;
            $previousScheduledAt = $fixture->scheduled_at ? Carbon::parse($fixture->scheduled_at) : null;
            if ($previousScheduledAt && $previousScheduledAt->gt($scheduledAt)) {
                $daysSaved = (int) $scheduledAt->diffInDays($previousScheduledAt);
            }

            // Audit record if override
            if ((! $homeRest || ! $awayRest) && $overrideWarnings) {
                \App\Domains\Match\Models\MatchResultAudit::create([
                    'fixture_id' => $fixture->id,
                    'match_id' => $fixture->match_id,
                    'user_id' => auth()->id(),
                    'action' => 'advance_match_override',
                    'description' => 'تقديم موعد المباراة وتجاوز تحذير فترة الراحة بقرار من اللجنة المنظمة',
                    'changes' => [
                        'previous_scheduled_at' => $previousScheduledAt?->toDateTimeString(),
                        'new_scheduled_at' => $scheduledAt->toDateTimeString(),
                        'days_saved' => $daysSaved,
                        'reason' => $overrideReason ?? 'تقديم المباراة لتقليص مدة الدوري',
                    ],
                ]);
            }

            // Step A: FREE the fixture\'s former occurrence or booking so it becomes vacant!
            \App\Domains\Booking\Models\TerrainBookingOccurrence::query()
                ->where('fixture_id', $fixture->id)
                ->where('status', \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_USED_BY_MATCH)
                ->update([
                    'fixture_id' => null,
                    'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_FREED,
                ]);

            \App\Domains\Booking\Models\TerrainBooking::query()
                ->where('fixture_id', $fixture->id)
                ->where('id', '!=', $booking->id)
                ->update(['fixture_id' => null]);

            // Step B: Update or create FootballMatch
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
                    'notes' => $notes,
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
                    'notes' => $notes,
                ]);
            }

            // Step C: Update fixture
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

            // Step D: Claim target occurrence / booking
            if ($booking->isWeeklySubscription()) {
                \App\Domains\Booking\Models\TerrainBookingOccurrence::updateOrCreate(
                    [
                        'terrain_booking_id' => $booking->id,
                        'occurrence_date' => $dateStr,
                    ],
                    [
                        'stadium_id' => $booking->terrain_id,
                        'start_time' => $booking->start_time,
                        'end_time' => $booking->end_time,
                        'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_USED_BY_MATCH,
                        'fixture_id' => $fixture->id,
                        'notes' => 'مباراة دوري (تقديم): '.$tournament->name.($isBorrowed ? ' (موعد مستعار)' : ''),
                    ]
                );
            } else {
                $booking->update(['fixture_id' => $fixture->id]);
            }

            \App\Domains\Booking\Services\SlotAvailabilityService::invalidate((int) $booking->terrain_id, $dateStr);
            if ($previousScheduledAt) {
                \App\Domains\Booking\Services\SlotAvailabilityService::invalidate((int) $fixture->stadium_id, $previousScheduledAt->toDateString());
            }

            // Re-sync league matchdays
            $fixtureService = $this->fixtureService ?? app(TournamentFixtureService::class);
            $fixtureService->syncLeagueMatchdays($tournament);

            // Notify
            $this->notifyMatchAssignment($tournament, $fixture, $booking);

            return [
                'fixture' => $fixture->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']),
                'days_saved' => $daysSaved,
                'message' => "تم تقديم موعد المباراة بنجاح إلى {$dateStr}".($daysSaved > 0 ? " (تم تقليص {$daysSaved} يوم في عمر الدوري)" : ''),
            ];
        });
    }

    /**
     * Step 3.4: Quick assign of nearest available slot to a pending/postponed match.
     */
    public function quickAssign(
        Tournament $tournament,
        Fixture $fixture,
        int $bookingId,
        string $dateStr,
        ?int $hostTeamId = null
    ): array {
        return DB::transaction(function () use ($tournament, $fixture, $bookingId, $dateStr, $hostTeamId) {
            $eligibility = app(LeagueEligibilityEngineService::class);
            $eligibility->assertNotLockedOrFinished($fixture);

            $booking = TerrainBooking::with(['terrain', 'team'])->findOrFail($bookingId);
            $slotOwnerId = (int) $booking->team_id;

            $teamAId = (int) $fixture->home_team_id;
            $teamBId = (int) $fixture->away_team_id;

            $isBorrowed = ($slotOwnerId !== $teamAId && $slotOwnerId !== $teamBId);

            // Determine host team
            if ($hostTeamId) {
                $newHomeId = $hostTeamId;
                $newAwayId = ($newHomeId === $teamAId) ? $teamBId : $teamAId;
            } elseif ($slotOwnerId === $teamAId || $slotOwnerId === $teamBId) {
                $newHomeId = $slotOwnerId;
                $newAwayId = ($newHomeId === $teamAId) ? $teamBId : $teamAId;
            } else {
                $newHomeId = $teamAId;
                $newAwayId = $teamBId;
            }

            $notes = $isBorrowed ? 'توقيت مستعار من حجز فريق '.($booking->team?->name ?? 'آخر') : null;
            $scheduledAt = Carbon::parse($dateStr.' '.$booking->start_time);

            // Snapshot for undo
            $snapshot = [
                'fixture_id' => $fixture->id,
                'home_team_id' => $fixture->home_team_id,
                'away_team_id' => $fixture->away_team_id,
                'scheduled_at' => $fixture->scheduled_at?->toDateTimeString(),
                'stadium_id' => $fixture->stadium_id,
                'status' => $fixture->status?->value,
                'match_id' => $fixture->match_id,
            ];

            // Match record
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
                    'notes' => $notes,
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
                    'notes' => $notes,
                ]);
            }

            // Free previous occurrence/booking occupied by this fixture
            \App\Domains\Booking\Models\TerrainBookingOccurrence::query()
                ->where('fixture_id', $fixture->id)
                ->where('status', \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_USED_BY_MATCH)
                ->update([
                    'fixture_id' => null,
                    'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_FREED,
                ]);

            \App\Domains\Booking\Models\TerrainBooking::query()
                ->where('fixture_id', $fixture->id)
                ->where('id', '!=', $booking->id)
                ->update(['fixture_id' => null]);

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
                'last_change_payload' => $snapshot,
            ]);

            if ($booking->isWeeklySubscription()) {
                \App\Domains\Booking\Models\TerrainBookingOccurrence::updateOrCreate(
                    [
                        'terrain_booking_id' => $booking->id,
                        'occurrence_date' => $dateStr,
                    ],
                    [
                        'stadium_id' => $booking->terrain_id,
                        'start_time' => $booking->start_time,
                        'end_time' => $booking->end_time,
                        'status' => \App\Domains\Booking\Models\TerrainBookingOccurrence::STATUS_USED_BY_MATCH,
                        'fixture_id' => $fixture->id,
                        'notes' => 'مباراة دوري: '.$tournament->name.($isBorrowed ? ' (موعد مستعار)' : ''),
                    ]
                );
            } else {
                $booking->update(['fixture_id' => $fixture->id]);
            }

            \App\Domains\Booking\Services\SlotAvailabilityService::invalidate((int) $booking->terrain_id, $dateStr);

            // Re-sync league matchdays
            $fixtureService = $this->fixtureService ?? app(TournamentFixtureService::class);
            $fixtureService->syncLeagueMatchdays($tournament);

            // Notify slot owner manager if borrowed
            if ($isBorrowed && $booking->team?->manager_id) {
                NotificationService::push(
                    (int) $booking->team->manager_id,
                    'announcement',
                    'استخدام موعدك لمباراة دوري',
                    "تم استخدام موعدك الأسبوعي لتاريخ {$dateStr} الساعة {$booking->start_time} لإقامة مباراة دوري ({$tournament->name}) بين {$fixture->homeTeam?->name} و {$fixture->awayTeam?->name}.",
                    ['tournament_id' => $tournament->id, 'fixture_id' => $fixture->id],
                    '/dashboard'
                );
            }

            $this->notifyMatchAssignment($tournament, $fixture, $booking);

            return [
                'fixture' => $fixture->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']),
                'message' => 'تم تعيين الموعد وتثبيته بنجاح'.($isBorrowed ? ' (موعد مستعار من حجز '.$booking->team?->name.')' : '.'),
            ];
        });
    }

    /**
     * Step 3.6: Notify organizer when a team finishes all its league matches.
     */
    public function checkAndNotifyFinishedTeams(Tournament $tournament): array
    {
        $cacheKey = "tournament_{$tournament->id}_notified_finished_teams";
        $notified = Cache::get($cacheKey, []);
        $newlyNotified = [];

        $registeredTeams = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->with('team')
            ->get();

        foreach ($registeredTeams as $tt) {
            $tid = (int) $tt->team_id;
            if (in_array($tid, $notified, true)) {
                continue;
            }

            $unfCount = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->where(fn ($q) => $q->where('home_team_id', $tid)->orWhere('away_team_id', $tid))
                ->where(function ($q) {
                    $q->whereNull('scheduled_at')
                        ->orWhereIn('status', [FixtureStatus::WaitingForBooking, FixtureStatus::ReschedulingRequired, FixtureStatus::Postponed]);
                })
                ->count();

            if ($unfCount === 0) {
                // Team has finished all league matches
                if ($tournament->organizer_id) {
                    NotificationService::push(
                        (int) $tournament->organizer_id,
                        'announcement',
                        'اكتمال مباريات فريق في الدوري',
                        "فريق {$tt->team?->name} أنهى جميع مبارياته في البطولة بنجاح",
                        ['tournament_id' => $tournament->id, 'team_id' => $tid],
                        "/tournaments/{$tournament->id}"
                    );
                }

                $notified[] = $tid;
                $newlyNotified[] = $tt->team?->name;
            }
        }

        if (! empty($newlyNotified)) {
            Cache::put($cacheKey, $notified, now()->addMonths(6));
        }

        return $newlyNotified;
    }
}
