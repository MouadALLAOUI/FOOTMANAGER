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

        // Allowed stadiums (if configured on tournament, otherwise open to any)
        $allowedStadiumIds = $tournament->stadiums()->pluck('stadiums.id')->all();

        // 1. Fetch available eligible bookings belonging to any registered team
        $nowDate = now()->toDateString();
        $startDate = $tournament->start_date?->toDateString() ?? $nowDate;
        $effectiveMinDate = max($nowDate, $startDate);

        $bookingsQuery = TerrainBooking::query()
            ->whereIn('team_id', $registeredTeamIds)
            ->whereIn('status', ['approved', 'confirmed'])
            ->whereNull('archived_at')
            ->whereNull('fixture_id')
            ->whereDate('booking_date', '>=', $effectiveMinDate)
            ->with(['terrain', 'team']);

        if ($tournament->end_date) {
            $bookingsQuery->whereDate('booking_date', '<=', $tournament->end_date->toDateString());
        }

        if (! empty($allowedStadiumIds)) {
            $bookingsQuery->whereIn('terrain_id', $allowedStadiumIds);
        }

        $bookings = $bookingsQuery->orderBy('booking_date')->orderBy('start_time')->get();

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

        foreach ($bookings as $booking) {
            $homeTeamId = (int) $booking->team_id;
            $bookingDate = Carbon::parse($booking->booking_date);
            $bookingStart = $booking->start_time;
            $bookingEnd = $booking->end_time;

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
                    'id' => "sug_{$booking->id}_{$fixture->id}",
                    'booking' => [
                        'id' => $booking->id,
                        'reference' => $booking->booking_reference,
                        'booking_date' => $booking->booking_date->toDateString(),
                        'start_time' => $booking->start_time,
                        'end_time' => $booking->end_time,
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
     * Atomically assign an existing booking to a league fixture and provision the match.
     */
    public function assign(Tournament $tournament, Fixture $fixture, TerrainBooking $booking, bool $allowBorrowed = false): array
    {
        return DB::transaction(function () use ($tournament, $fixture, $booking, $allowBorrowed) {
            // Re-validate consistency
            if ((int) $fixture->competition_id !== (int) $tournament->competition_id) {
                throw new DomainException('المباراة لا تنتمي إلى هذا الدوري');
            }

            $isHomeBooking = ((int) $booking->team_id === (int) $fixture->home_team_id);
            if (! $isHomeBooking && ! $allowBorrowed) {
                throw new DomainException('الحجز يجب أن يكون تابعاً للفريق المضيف (أو تفعيل خيار استعارة توقيت)');
            }

            if ($booking->fixture_id && (int) $booking->fixture_id !== (int) $fixture->id) {
                throw new DomainException('هذا الحجز مرتبط بمباراة أخرى بالفعل');
            }

            if ($fixture->match && $fixture->match->status === MatchStatus::Finished) {
                throw new DomainException('لا يمكن إعادة جدولة مباراة ملعوبة');
            }

            $bookingDateStr = $booking->booking_date instanceof Carbon
                ? $booking->booking_date->toDateString()
                : (string) $booking->booking_date;

            $scheduledAt = Carbon::parse($bookingDateStr.' '.$booking->start_time);

            $notes = null;
            if (! $isHomeBooking) {
                $notes = 'توقيت مستعار من فريق ' . ($booking->team?->name ?? 'آخر');
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
                    'created_by' => auth()->id(),
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
            ]);

            // Link booking
            $booking->update([
                'fixture_id' => $fixture->id,
            ]);

            // Notify team managers
            $this->notifyMatchAssignment($tournament, $fixture, $booking);

            return [
                'fixture' => $fixture->fresh(['homeTeam', 'awayTeam', 'stadium', 'match']),
                'booking' => $booking->fresh(),
                'is_borrowed' => ! $isHomeBooking,
                'message' => 'تم اعتماد وتثبيت المباراة وربطها بالحجز بنجاح' . (! $isHomeBooking ? ' (توقيت مستعار)' : ''),
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

            // Unlink booking if exists
            $booking = TerrainBooking::query()->where('fixture_id', $fixture->id)->first();
            if ($booking) {
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
