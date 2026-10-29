<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Enums\RoundStage;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchResultAudit;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use Illuminate\Support\Facades\DB;

class TeamDisciplineService
{
    public function __construct(
        private readonly TournamentBracketService $bracket,
        private readonly TournamentTerrainBookingService $bookings,
    ) {}

    /**
     * Preview team withdrawal or disqualification consequences.
     *
     * @return array<string, mixed>
     */
    public function getDisciplinePreview(Tournament $tournament, int $teamId): array
    {
        $tournamentTeam = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('team_id', $teamId)
            ->with('team')
            ->firstOrFail();

        $team = $tournamentTeam->team;

        $fixtures = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where(function ($q) use ($teamId) {
                $q->where('home_team_id', $teamId)->orWhere('away_team_id', $teamId);
            })
            ->with(['match', 'homeTeam', 'awayTeam', 'stadium', 'round', 'group'])
            ->orderBy('matchday')
            ->orderBy('scheduled_at')
            ->get();

        $completedMatches = [];
        $inProgressMatches = [];
        $remainingMatches = [];
        $hasAppliedConsequences = false;

        foreach ($fixtures as $f) {
            $isHome = (int) $f->home_team_id === $teamId;
            $opponent = $isHome ? $f->awayTeam : $f->homeTeam;
            $match = $f->match;

            $isDefaultResult = false;
            if ($match && $match->notes && str_contains($match->notes, '[default_result:points_only]')) {
                $isDefaultResult = true;
            } elseif (! empty($f->last_change_payload['is_default_result'])) {
                $isDefaultResult = true;
            }

            if ($isDefaultResult) {
                $hasAppliedConsequences = true;
            }

            $bookingInfo = $this->analyzeBooking($f, $teamId);

            $matchData = [
                'id' => $f->id,
                'match_id' => $match?->id,
                'matchday' => $f->matchday,
                'stage' => $f->round?->stage?->value ?? $f->round?->stage ?? 'group',
                'round_name' => $f->round?->name,
                'group_name' => $f->group?->name,
                'scheduled_at' => $f->scheduled_at?->format('Y-m-d H:i'),
                'stadium_name' => $f->stadium?->name,
                'is_home' => $isHome,
                'team_name' => $team?->name,
                'opponent' => $opponent ? [
                    'id' => $opponent->id,
                    'name' => $opponent->name,
                    'logo_url' => $opponent->logo_url,
                ] : null,
                'status' => $f->status?->value ?? (string) $f->status,
                'match_status' => $match?->status?->value ?? (string) $match?->status,
                'home_score' => $match?->home_score,
                'away_score' => $match?->away_score,
                'is_default_result' => $isDefaultResult,
                'booking_info' => $bookingInfo,
            ];

            if ($match?->status === MatchStatus::Finished || $f->status === FixtureStatus::Played) {
                $completedMatches[] = $matchData;
            } elseif ($match && in_array($match->status, MatchStatus::live(), true)) {
                $inProgressMatches[] = $matchData;
            } elseif ($f->status !== FixtureStatus::Cancelled) {
                $remainingMatches[] = $matchData;
            }
        }

        $isDisciplined = in_array($tournamentTeam->status, [
            TournamentTeam::STATUS_WITHDRAWN,
            TournamentTeam::STATUS_DISQUALIFIED,
        ], true);

        $defaultScore = $tournament->qualification_rules['default_win_score'] ?? '3-0';
        $pointsForWin = $tournament->points_for_win ?: 3;

        return [
            'team' => [
                'id' => $team?->id,
                'name' => $team?->name,
                'logo_url' => $team?->logo_url,
                'current_status' => $tournamentTeam->status,
                'is_withdrawn' => $tournamentTeam->status === TournamentTeam::STATUS_WITHDRAWN,
                'is_disqualified' => $tournamentTeam->status === TournamentTeam::STATUS_DISQUALIFIED,
            ],
            'tournament' => [
                'id' => $tournament->id,
                'name' => $tournament->name,
                'default_win_score' => $defaultScore,
                'points_for_win' => $pointsForWin,
            ],
            'can_reverse' => $isDisciplined && ! $hasAppliedConsequences,
            'is_final' => $hasAppliedConsequences,
            'has_live_match' => count($inProgressMatches) > 0,
            'completed_matches' => $completedMatches,
            'in_progress_matches' => $inProgressMatches,
            'remaining_matches' => $remainingMatches,
            'summary' => [
                'completed_count' => count($completedMatches),
                'in_progress_count' => count($inProgressMatches),
                'remaining_count' => count($remainingMatches),
            ],
        ];
    }

    /**
     * Mark team as withdrawn.
     */
    public function withdrawTeam(Tournament $tournament, int $teamId, ?string $reason = null, ?int $userId = null, bool $applyRemaining = false): array
    {
        return DB::transaction(function () use ($tournament, $teamId, $reason, $userId, $applyRemaining) {
            $tournamentTeam = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('team_id', $teamId)
                ->with('team')
                ->lockForUpdate()
                ->firstOrFail();

            if ($tournamentTeam->status !== TournamentTeam::STATUS_REGISTERED) {
                throw new DomainException('لا يمكن تسجيل الانسحاب إلا لفريق مسجل ونشط في البطولة');
            }

            $tournamentTeam->update([
                'status' => TournamentTeam::STATUS_WITHDRAWN,
            ]);

            MatchResultAudit::create([
                'fixture_id' => null,
                'match_id' => null,
                'user_id' => $userId ?? auth()->id(),
                'action' => 'team_withdrawn',
                'description' => "تسجيل انسحاب فريق {$tournamentTeam->team?->name} من البطولة بقرار اللجنة المنظمة",
                'changes' => [
                    'team_id' => $teamId,
                    'tournament_id' => $tournament->id,
                    'status' => TournamentTeam::STATUS_WITHDRAWN,
                    'reason' => $reason ?? 'انسحاب معتمد من اللجنة المنظمة',
                    'apply_remaining' => $applyRemaining,
                ],
            ]);

            if ($applyRemaining) {
                $this->applyAllDefaultResults($tournament, $teamId, $userId);
            }

            return $this->getDisciplinePreview($tournament, $teamId);
        });
    }

    /**
     * Mark team as disqualified.
     */
    public function disqualifyTeam(Tournament $tournament, int $teamId, ?string $reason = null, ?int $userId = null, bool $applyRemaining = false): array
    {
        return DB::transaction(function () use ($tournament, $teamId, $reason, $userId, $applyRemaining) {
            $tournamentTeam = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('team_id', $teamId)
                ->with('team')
                ->lockForUpdate()
                ->firstOrFail();

            if ($tournamentTeam->status !== TournamentTeam::STATUS_REGISTERED) {
                throw new DomainException('لا يمكن تسجيل الطرد إلا لفريق مسجل ونشط في البطولة');
            }

            $tournamentTeam->update([
                'status' => TournamentTeam::STATUS_DISQUALIFIED,
            ]);

            MatchResultAudit::create([
                'fixture_id' => null,
                'match_id' => null,
                'user_id' => $userId ?? auth()->id(),
                'action' => 'team_disqualified',
                'description' => "تسجيل طرد فريق {$tournamentTeam->team?->name} من البطولة بقرار اللجنة المنظمة",
                'changes' => [
                    'team_id' => $teamId,
                    'tournament_id' => $tournament->id,
                    'status' => TournamentTeam::STATUS_DISQUALIFIED,
                    'reason' => $reason ?? 'طرد معتمد من اللجنة المنظمة',
                    'apply_remaining' => $applyRemaining,
                ],
            ]);

            if ($applyRemaining) {
                $this->applyAllDefaultResults($tournament, $teamId, $userId);
            }

            return $this->getDisciplinePreview($tournament, $teamId);
        });
    }

    /**
     * Apply default results to all remaining unplayed fixtures for a disciplined team.
     *
     * @return array<string, mixed>
     */
    public function applyAllDefaultResults(Tournament $tournament, int $teamId, ?int $userId = null): array
    {
        return DB::transaction(function () use ($tournament, $teamId, $userId) {
            $tournamentTeam = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('team_id', $teamId)
                ->with('team')
                ->firstOrFail();

            if (! in_array($tournamentTeam->status, [TournamentTeam::STATUS_WITHDRAWN, TournamentTeam::STATUS_DISQUALIFIED], true)) {
                throw new DomainException('يجب تسجيل انسحاب أو طرد الفريق أولاً قبل تطبيق النتائج الاعتبارية للمباريات');
            }

            $unplayedFixtures = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->where(function ($q) use ($teamId) {
                    $q->where('home_team_id', $teamId)->orWhere('away_team_id', $teamId);
                })
                ->where('status', '!=', FixtureStatus::Played)
                ->whereDoesntHave('match', function ($q) {
                    $q->where('status', MatchStatus::Finished);
                })
                ->get();

            $appliedFixtures = [];
            foreach ($unplayedFixtures as $fixture) {
                // If fixture already has a live match, skip it
                if ($fixture->match && in_array($fixture->match->status, MatchStatus::live(), true)) {
                    continue;
                }

                $res = $this->applyMatchDefaultResult($tournament, $fixture, $teamId, $userId);
                $appliedFixtures[] = $res['fixture'];
            }

            return [
                'applied_count' => count($appliedFixtures),
                'fixtures' => $appliedFixtures,
                'preview' => $this->getDisciplinePreview($tournament, $teamId),
            ];
        });
    }

    /**
     * Reverse discipline decision if no default results have been applied yet.
     */
    public function reverseDiscipline(Tournament $tournament, int $teamId, ?int $userId = null): array
    {
        return DB::transaction(function () use ($tournament, $teamId, $userId) {
            $tournamentTeam = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('team_id', $teamId)
                ->with('team')
                ->lockForUpdate()
                ->firstOrFail();

            if (! in_array($tournamentTeam->status, [TournamentTeam::STATUS_WITHDRAWN, TournamentTeam::STATUS_DISQUALIFIED], true)) {
                throw new DomainException('الفريق ليس في حالة انسحاب أو طرد');
            }

            $hasAppliedConsequences = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->where(function ($q) use ($teamId) {
                    $q->where('home_team_id', $teamId)->orWhere('away_team_id', $teamId);
                })
                ->where(function ($q) {
                    $q->whereHas('match', fn ($mq) => $mq->where('notes', 'LIKE', '%[default_result:points_only]%'))
                        ->orWhere('last_change_payload->is_default_result', true);
                })
                ->exists();

            if ($hasAppliedConsequences) {
                throw new DomainException('لا يمكن التراجع عن القرار بعد تطبيق نتائج اعتبارية على المباريات المتبقية');
            }

            $previousStatus = $tournamentTeam->status;
            $tournamentTeam->update([
                'status' => TournamentTeam::STATUS_REGISTERED,
            ]);

            MatchResultAudit::create([
                'fixture_id' => null,
                'match_id' => null,
                'user_id' => $userId ?? auth()->id(),
                'action' => 'team_discipline_reversed',
                'description' => "التراجع عن قرار {$previousStatus} لفريق {$tournamentTeam->team?->name} واستعادة وضعه النشط",
                'changes' => [
                    'team_id' => $teamId,
                    'previous_status' => $previousStatus,
                    'restored_status' => TournamentTeam::STATUS_REGISTERED,
                ],
            ]);

            return $this->getDisciplinePreview($tournament, $teamId);
        });
    }

    /**
     * Apply default result to a single remaining fixture individually.
     */
    public function applyMatchDefaultResult(Tournament $tournament, Fixture $fixture, int $withdrawnTeamId, ?int $userId = null): array
    {
        return DB::transaction(function () use ($tournament, $fixture, $withdrawnTeamId, $userId) {
            if ((int) $fixture->competition_id !== (int) $tournament->competition_id
                || (int) $fixture->season_id !== (int) $tournament->season_id) {
                throw new DomainException('المباراة لا تنتمي إلى هذه البطولة');
            }

            if ((int) $fixture->home_team_id !== $withdrawnTeamId && (int) $fixture->away_team_id !== $withdrawnTeamId) {
                throw new DomainException('الفريق المنسحب/المقصى ليس طرفاً في هذه المباراة');
            }

            $tournamentTeam = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->where('team_id', $withdrawnTeamId)
                ->with('team')
                ->firstOrFail();

            if (! in_array($tournamentTeam->status, [TournamentTeam::STATUS_WITHDRAWN, TournamentTeam::STATUS_DISQUALIFIED], true)) {
                throw new DomainException('يجب تسجيل انسحاب أو طرد الفريق أولاً قبل تطبيق النتيجة الاعتبارية للمباراة');
            }

            $match = $fixture->match;

            if ($match && in_array($match->status, MatchStatus::live(), true)) {
                throw new DomainException('المباراة جارية حالياً — يجب تسويتها أولاً عبر مسار المباريات المعتاد');
            }

            if ($match && $match->status === MatchStatus::Finished) {
                throw new DomainException('المباراة ملعوبة ومسجلة نتيجتها بالفعل');
            }

            $isHomeWithdrawn = (int) $fixture->home_team_id === $withdrawnTeamId;
            $winnerTeamId = $isHomeWithdrawn ? (int) $fixture->away_team_id : (int) $fixture->home_team_id;
            $winnerTeam = Team::query()->withTrashed()->find($winnerTeamId);

            // Default score from tournament settings (e.g. 3-0)
            $defaultScoreSetting = $tournament->qualification_rules['default_win_score'] ?? '3-0';
            $scoreParts = explode('-', (string) $defaultScoreSetting);
            $winnerGoals = isset($scoreParts[0]) ? (int) trim($scoreParts[0]) : 3;
            $loserGoals = isset($scoreParts[1]) ? (int) trim($scoreParts[1]) : 0;

            $homeScore = $isHomeWithdrawn ? $loserGoals : $winnerGoals;
            $awayScore = $isHomeWithdrawn ? $winnerGoals : $loserGoals;

            $disciplineLabel = $tournamentTeam->status === TournamentTeam::STATUS_WITHDRAWN ? 'انسحاب' : 'طرد';
            $notesTag = "[default_result:points_only] نتيجة اعتبارية لصالح {$winnerTeam?->name} ({$defaultScoreSetting}) بسبب {$disciplineLabel} فريق {$tournamentTeam->team?->name}";

            // Handle pitch booking according to Section 6
            $bookingHandling = $this->handleBookingOnDefaultResult($fixture, $withdrawnTeamId);

            if (! $match) {
                $match = FootballMatch::create([
                    'competition_id' => $fixture->competition_id,
                    'season_id' => $fixture->season_id,
                    'round_id' => $fixture->round_id,
                    'group_id' => $fixture->group_id,
                    'home_team_id' => $fixture->home_team_id,
                    'away_team_id' => $fixture->away_team_id,
                    'stadium_id' => $fixture->stadium_id,
                    'status' => MatchStatus::Finished,
                    'current_period' => 'full_time',
                    'current_minute' => $tournament->match_duration_minutes ?: 90,
                    'home_score' => $homeScore,
                    'away_score' => $awayScore,
                    'winner_team_id' => $winnerTeamId,
                    'notes' => $notesTag,
                    'is_confirmed' => true,
                    'created_by' => $userId ?? auth()->id(),
                    'ended_at' => now(),
                ]);

                $fixture->forceFill(['match_id' => $match->id])->save();
            } else {
                $match->forceFill([
                    'status' => MatchStatus::Finished,
                    'current_period' => 'full_time',
                    'current_minute' => $match->match_duration_minutes ?: ($tournament->match_duration_minutes ?: 90),
                    'home_score' => $homeScore,
                    'away_score' => $awayScore,
                    'winner_team_id' => $winnerTeamId,
                    'notes' => $match->notes ? $match->notes." | {$notesTag}" : $notesTag,
                    'ended_at' => now(),
                ])->save();
            }

            $fixture->forceFill([
                'status' => FixtureStatus::Played,
                'last_change_payload' => [
                    'action' => 'default_result',
                    'is_default_result' => true,
                    'points_only' => true,
                    'withdrawn_team_id' => $withdrawnTeamId,
                    'winner_team_id' => $winnerTeamId,
                    'default_score' => "{$homeScore}-{$awayScore}",
                    'booking_handling' => $bookingHandling,
                    'freed_scheduled_at' => $fixture->scheduled_at?->toDateTimeString(),
                    'freed_stadium_id' => $fixture->stadium_id,
                    'slot_reassigned' => false,
                    'applied_at' => now()->toIso8601String(),
                ],
            ])->save();

            // Progress knockout bracket if applicable
            $round = $fixture->round;
            if ($round && $round->stage !== RoundStage::Group) {
                $this->bracket->progress($fixture, $tournament);
            }

            MatchResultAudit::create([
                'fixture_id' => $fixture->id,
                'match_id' => $match->id,
                'user_id' => $userId ?? auth()->id(),
                'action' => 'apply_default_result',
                'description' => "تطبيق نتيجة اعتبارية فردية لصالح {$winnerTeam?->name} ضد {$tournamentTeam->team?->name} ({$disciplineLabel})",
                'changes' => [
                    'withdrawn_team_id' => $withdrawnTeamId,
                    'winner_team_id' => $winnerTeamId,
                    'home_score' => $homeScore,
                    'away_score' => $awayScore,
                    'default_score_setting' => $defaultScoreSetting,
                    'points_only' => true,
                    'booking_handling' => $bookingHandling,
                ],
            ]);

            return [
                'fixture' => $fixture->fresh(['match', 'homeTeam', 'awayTeam', 'stadium', 'round']),
                'booking_handling' => $bookingHandling,
                'message' => "تم تطبيق النتيجة الاعتبارية للمباراة بنجاح لصالح {$winnerTeam?->name}",
            ];
        });
    }

    /**
     * Analyze pitch booking source and status.
     *
     * @return array<string, mixed>
     */
    private function analyzeBooking(Fixture $fixture, int $withdrawnTeamId): array
    {
        $bookingId = $fixture->match?->active_reservation_id;
        $booking = $bookingId ? TerrainBooking::find($bookingId) : TerrainBooking::where('fixture_id', $fixture->id)->whereNull('archived_at')->first();

        if (! $booking) {
            return [
                'has_booking' => false,
                'type' => 'none',
                'status_label' => 'لا يوجد حجز ملعب',
                'note' => 'المباراة غير مرتبطة بحجز ملعب نشط.',
                'action' => 'none',
            ];
        }

        $bookingTeamId = $booking->team_id ? (int) $booking->team_id : null;
        $hasConflict = false;

        // Check if booking is linked to another fixture
        if ($booking->fixture_id && (int) $booking->fixture_id !== (int) $fixture->id) {
            $hasConflict = true;
        }

        if ($hasConflict) {
            return [
                'has_booking' => true,
                'booking_id' => $booking->id,
                'type' => 'conflict',
                'status_label' => 'تعارض حجز ملعب',
                'note' => 'الحجز مرتبط بمباراة أخرى في النظام — يتطلب مراجعة اللجنة قبل أي تعديل.',
                'action' => 'flag_conflict',
            ];
        }

        if ($bookingTeamId === null) {
            return [
                'has_booking' => true,
                'booking_id' => $booking->id,
                'type' => 'unknown',
                'status_label' => 'مصدر حجز غير معروف',
                'note' => 'مصدر الحجز غير مسجل صراحة في المنصة — لا يتم إلغاؤه أو تحريره تلقائياً ويحال لمراجعة اللجنة.',
                'action' => 'flag_unknown',
            ];
        }

        if ($bookingTeamId === $withdrawnTeamId) {
            return [
                'has_booking' => true,
                'booking_id' => $booking->id,
                'type' => 'team_own',
                'status_label' => 'حجز يخص الفريق المنسحب/المقصى',
                'note' => 'حجز خاص بالفريق — لا يجوز للجنة إلغاؤه أو تحويله أو التدخل فيه، وسيبقى مسجلاً في حساب الفريق.',
                'action' => 'preserve_team_booking',
            ];
        }

        // Borrowed booking belonging to opponent or other source
        return [
            'has_booking' => true,
            'booking_id' => $booking->id,
            'type' => 'borrowed_or_allocated',
            'status_label' => 'حجز مستعار / مخصص',
            'note' => 'حجز مخصص من جهة أخرى — سيتم تحريره ليكون متاحاً لإعادة التعيين لفرق البطولة.',
            'action' => 'release_to_pool',
        ];
    }

    /**
     * Handle pitch booking according to Section 6 when applying a default result.
     *
     * @return array<string, mixed>
     */
    private function handleBookingOnDefaultResult(Fixture $fixture, int $withdrawnTeamId): array
    {
        $analysis = $this->analyzeBooking($fixture, $withdrawnTeamId);

        if (! $analysis['has_booking']) {
            return $analysis;
        }

        $bookingId = $analysis['booking_id'] ?? null;
        $booking = $bookingId ? TerrainBooking::find($bookingId) : null;

        if (! $booking) {
            return $analysis;
        }

        if ($analysis['action'] === 'preserve_team_booking') {
            // Unlink from match without cancelling, transferring, or archiving the team's booking
            if ($fixture->match) {
                $fixture->match->update(['active_reservation_id' => null]);
            }
            $booking->update(['fixture_id' => null]);

            return array_merge($analysis, [
                'executed' => 'preserved_and_unlinked',
                'execution_message' => 'تم الحفاظ على حجز الفريق دون مساس وفصله عن المباراة',
            ]);
        }

        if ($analysis['action'] === 'release_to_pool') {
            // Release borrowed booking so it can be reassigned
            $this->bookings->archiveForFixture($fixture);
            if ($fixture->match) {
                $fixture->match->update(['active_reservation_id' => null]);
            }

            return array_merge($analysis, [
                'executed' => 'released_to_pool',
                'execution_message' => 'تم تحرير الحجز المستعار بنجاح ليعود لحوض مواعيد البطولة',
            ]);
        }

        // Unknown or conflict: do NOT release automatically; flag for committee review
        return array_merge($analysis, [
            'executed' => 'flagged_for_manual_review',
            'execution_message' => 'تم تعليق الحجز وإحالته للمراجعة اليدوية للجنة المنظمة دون إلغاء تلقائي',
        ]);
    }

    /**
     * Get all unplayed fixtures in tournament eligible to receive a freed slot.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getUnplayedFixtures(Tournament $tournament): array
    {
        $withdrawnTeamIds = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->whereIn('status', [TournamentTeam::STATUS_WITHDRAWN, TournamentTeam::STATUS_DISQUALIFIED])
            ->pluck('team_id')
            ->all();

        $fixtures = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->whereNotNull('home_team_id')
            ->whereNotNull('away_team_id')
            ->whereNotIn('home_team_id', $withdrawnTeamIds)
            ->whereNotIn('away_team_id', $withdrawnTeamIds)
            ->where('status', '!=', FixtureStatus::Played)
            ->whereDoesntHave('match', function ($q) {
                $q->where('status', MatchStatus::Finished);
            })
            ->with(['homeTeam', 'awayTeam', 'stadium', 'round', 'group'])
            ->orderByRaw('scheduled_at IS NULL DESC')
            ->orderBy('scheduled_at', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        return $fixtures->map(function ($f) {
            return [
                'id' => $f->id,
                'matchday' => $f->matchday,
                'home_team' => $f->homeTeam ? [
                    'id' => $f->homeTeam->id,
                    'name' => $f->homeTeam->name,
                    'logo_url' => $f->homeTeam->logo_url,
                ] : null,
                'away_team' => $f->awayTeam ? [
                    'id' => $f->awayTeam->id,
                    'name' => $f->awayTeam->name,
                    'logo_url' => $f->awayTeam->logo_url,
                ] : null,
                'status' => $f->status?->value,
                'scheduled_at' => $f->scheduled_at?->toDateTimeString(),
                'stadium' => $f->stadium ? [
                    'id' => $f->stadium->id,
                    'name' => $f->stadium->name,
                ] : null,
                'round_name' => $f->round?->name,
                'group_name' => $f->group?->name,
            ];
        })->all();
    }

    /**
     * Reassign the freed slot of a default-result match to another unplayed match.
     *
     * @return array<string, mixed>
     */
    public function reassignFreedSlot(Tournament $tournament, Fixture $fixture, int $targetFixtureId, ?int $userId = null): array
    {
        return DB::transaction(function () use ($tournament, $fixture, $targetFixtureId, $userId) {
            if ((int) $fixture->competition_id !== (int) $tournament->competition_id
                || (int) $fixture->season_id !== (int) $tournament->season_id) {
                throw new DomainException('المباراة الأصلية لا تنتمي إلى هذه البطولة');
            }

            $payload = $fixture->last_change_payload ?? [];
            $isDefault = ! empty($payload['is_default_result'])
                || ($fixture->match && str_contains($fixture->match->notes ?? '', '[default_result:points_only]'));

            if (! $isDefault) {
                throw new DomainException('لا يمكن إسناد الموعد إلا من مباراة محسومة بفوز اعتباري');
            }

            if (($payload['booking_handling']['type'] ?? '') === 'team_own') {
                throw new DomainException('توقيت المباراة يخص حجز الفريق المطرود/المنسحب ولا يمكن إعادة استخدامه لفرق أخرى');
            }

            if (! empty($payload['slot_reassigned'])) {
                throw new DomainException('تم إسناد موعد هذه المباراة بالفعل لمباراة أخرى');
            }

            $scheduledAt = $fixture->scheduled_at ?? $payload['freed_scheduled_at'] ?? null;
            $stadiumId = $fixture->stadium_id ?? $payload['freed_stadium_id'] ?? null;

            if (! $scheduledAt) {
                throw new DomainException('المباراة الأصلية لا تحتوي على موعد مجدول لإسناده');
            }

            $targetFixture = Fixture::with(['match', 'homeTeam', 'awayTeam', 'stadium'])->findOrFail($targetFixtureId);
            if ((int) $targetFixture->competition_id !== (int) $tournament->competition_id
                || (int) $targetFixture->season_id !== (int) $tournament->season_id) {
                throw new DomainException('المباراة المستهدفة لا تنتمي إلى هذه البطولة');
            }

            if ($targetFixture->status === FixtureStatus::Played || ($targetFixture->match && $targetFixture->match->status === MatchStatus::Finished)) {
                throw new DomainException('المباراة المستهدفة ملعوبة ومسجلة نتيجتها بالفعل');
            }

            $withdrawnTeamIds = TournamentTeam::query()
                ->where('tournament_id', $tournament->id)
                ->whereIn('status', [TournamentTeam::STATUS_WITHDRAWN, TournamentTeam::STATUS_DISQUALIFIED])
                ->pluck('team_id')
                ->all();

            if (in_array((int) $targetFixture->home_team_id, $withdrawnTeamIds, true)
                || in_array((int) $targetFixture->away_team_id, $withdrawnTeamIds, true)) {
                throw new DomainException('لا يمكن إسناد الموعد لمباراة طرفها فريق مطرود أو منسحب');
            }

            // Assign slot to target fixture
            $targetFixture->update([
                'scheduled_at' => $scheduledAt,
                'stadium_id' => $stadiumId,
                'status' => FixtureStatus::Scheduled,
                'unscheduled_reason' => null,
                'is_rescheduled' => true,
            ]);

            if ($targetFixture->match) {
                $targetFixture->match->update([
                    'stadium_id' => $stadiumId,
                    'status' => MatchStatus::Scheduled,
                    'is_confirmed' => true,
                ]);
            } else {
                $newMatch = FootballMatch::create([
                    'competition_id' => $tournament->competition_id,
                    'season_id' => $tournament->season_id,
                    'round_id' => $targetFixture->round_id,
                    'group_id' => $targetFixture->group_id,
                    'home_team_id' => $targetFixture->home_team_id,
                    'away_team_id' => $targetFixture->away_team_id,
                    'stadium_id' => $stadiumId,
                    'status' => MatchStatus::Scheduled,
                    'is_confirmed' => true,
                    'created_by' => $userId ?? auth()->id(),
                ]);
                $targetFixture->update(['match_id' => $newMatch->id]);
            }

            // Mark source fixture slot as reassigned
            $targetTitle = "{$targetFixture->homeTeam?->name} ضد {$targetFixture->awayTeam?->name}";
            $payload['slot_reassigned'] = true;
            $payload['reassigned_to_fixture_id'] = $targetFixture->id;
            $payload['reassigned_to_title'] = $targetTitle;
            $payload['reassigned_at'] = now()->toIso8601String();

            $fixture->forceFill([
                'last_change_payload' => $payload,
            ])->save();

            MatchResultAudit::create([
                'fixture_id' => $targetFixture->id,
                'match_id' => $targetFixture->match_id,
                'user_id' => $userId ?? auth()->id(),
                'action' => 'reassign_freed_slot',
                'description' => "إسناد الموعد المحرر ({$scheduledAt}) من المباراة {$fixture->id} إلى المباراة {$targetTitle}",
                'changes' => [
                    'source_fixture_id' => $fixture->id,
                    'target_fixture_id' => $targetFixture->id,
                    'scheduled_at' => $scheduledAt,
                    'stadium_id' => $stadiumId,
                ],
            ]);

            return [
                'source_fixture' => $fixture->fresh(),
                'target_fixture' => $targetFixture->fresh(['match', 'homeTeam', 'awayTeam', 'stadium']),
                'message' => "تم إسناد الموعد بنجاح لمباراة {$targetTitle}",
            ];
        });
    }
}
