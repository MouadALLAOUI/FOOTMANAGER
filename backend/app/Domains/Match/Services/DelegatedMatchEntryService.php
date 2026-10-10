<?php

namespace App\Domains\Match\Services;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchDelegatedSubmission;
use App\Domains\Match\Models\MatchDelegatedToken;
use App\Domains\Match\Models\MatchResultAudit;
use App\Domains\Notification\Services\NotificationService;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentSquadMember;
use App\Domains\Tournament\Services\TournamentFoulRuleService;
use App\Domains\Tournament\Services\TournamentResultService;
use App\Domains\Tournament\Services\TournamentSquadService;
use App\Domains\Player\Models\Player;
use App\Domains\Team\Models\Team;
use App\Domains\Match\Models\MatchLineup;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DelegatedMatchEntryService
{
    public const TIMEZONE = 'Africa/Casablanca';
    public const DEFAULT_HOURS_BEFORE_KICKOFF = 2;
    public const DEFAULT_HOURS_AFTER_SCHEDULED_END = 3;
    public const DEFAULT_ANOMALY_SCORE_THRESHOLD = 10;
    public const DEFAULT_UNREVIEWED_HOURS_THRESHOLD = 12;

    public function __construct(
        private readonly TournamentResultService $resultService,
        private readonly TournamentFoulRuleService $foulRules,
        private readonly TournamentSquadService $squadService,
    ) {}

    /**
     * Generate or regenerate a secret match entry link.
     * Returns the long plain token once (which should be provided to the committee UI),
     * and stores only the SHA-256 hash in the database.
     *
     * @return array{token: string, url: string, valid_until: string, share_text: string, qr_data: string}
     */
    public function generateToken(Tournament $tournament, Fixture $fixture, int $organizerId, string $mode = 'full'): array
    {
        // If the organizer already entered the final result themselves, the link is disabled
        if ($fixture->match && $fixture->match->status->value === 'finished') {
            throw new DomainException('لا يمكن إنشاء رابط تسجيل لمباراة تم اعتماد نتيجتها بالفعل');
        }

        $mode = in_array($mode, ['full', 'simple'], true) ? $mode : 'full';

        return DB::transaction(function () use ($tournament, $fixture, $organizerId, $mode) {
            // Revoke any existing active tokens for this fixture
            MatchDelegatedToken::query()
                ->where('fixture_id', $fixture->id)
                ->where('is_revoked', false)
                ->update([
                    'is_revoked' => true,
                    'revoked_at' => now(),
                    'status' => 'revoked',
                ]);

            $plainToken = Str::random(48);
            $tokenHash = hash('sha256', $plainToken);

            $scheduledAt = $fixture->scheduled_at
                ? Carbon::parse($fixture->scheduled_at, self::TIMEZONE)
                : now(self::TIMEZONE);

            $now = now(self::TIMEZONE);
            // Link is immediately active upon generation by the committee
            $validFrom = $now->copy()->subMinutes(5);

            // Valid until: at least 3 hours from now, or 3 hours after scheduled end (5h from kickoff)
            $standardEnd = $scheduledAt->copy()->addHours(self::DEFAULT_HOURS_AFTER_SCHEDULED_END + 2);
            $validUntil = $standardEnd->gt($now->copy()->addHours(self::DEFAULT_HOURS_AFTER_SCHEDULED_END))
                ? $standardEnd
                : $now->copy()->addHours(self::DEFAULT_HOURS_AFTER_SCHEDULED_END);

            $tokenRecord = MatchDelegatedToken::create([
                'fixture_id' => $fixture->id,
                'token_hash' => $tokenHash,
                'valid_from' => $validFrom->utc(),
                'valid_until' => $validUntil->utc(),
                'status' => 'active',
                'mode' => $mode,
                'is_revoked' => false,
                'created_by' => $organizerId,
                'ip_addresses' => [],
            ]);

            $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');
            $url = "{$frontendUrl}/match-entry/{$plainToken}";

            $homeName = $fixture->homeTeam?->name ?? 'الفريق 1';
            $awayName = $fixture->awayTeam?->name ?? 'الفريق 2';
            $timeLabel = $validUntil->locale('ar')->translatedFormat('h:i A');

            $shareText = "رابط تسجيل مباراة {$homeName} ضد {$awayName}، صالح حتى {$timeLabel}. لا تشاركه مع أحد.\n{$url}";

            $this->audit($fixture->match_id ? FootballMatch::find($fixture->match_id) : null, $fixture, 'delegated_link_generated', $organizerId, [
                'token_id' => $tokenRecord->id,
                'mode' => $mode,
                'valid_until' => $validUntil->toDateTimeString(),
            ]);

            return [
                'token' => $plainToken,
                'url' => $url,
                'mode' => $mode,
                'valid_from' => $validFrom->toIso8601String(),
                'valid_until' => $validUntil->toIso8601String(),
                'share_text' => $shareText,
                'qr_data' => $url,
            ];
        });
    }

    /**
     * Update the mode ('full' or 'simple') of an existing active delegated link.
     */
    public function updateMode(Fixture $fixture, string $mode, int $organizerId): MatchDelegatedToken
    {
        $mode = in_array($mode, ['full', 'simple'], true) ? $mode : 'full';

        $tokenRecord = MatchDelegatedToken::query()
            ->where('fixture_id', $fixture->id)
            ->where('is_revoked', false)
            ->where('status', '!=', 'revoked')
            ->latest()
            ->first();

        if (! $tokenRecord || ! $tokenRecord->isValid()) {
            throw new DomainException('لا يوجد رابط نشط لهذه المباراة لتعديل وضعه');
        }

        $tokenRecord->update(['mode' => $mode]);

        $this->audit($fixture->match_id ? FootballMatch::find($fixture->match_id) : null, $fixture, 'delegated_link_mode_updated', $organizerId, [
            'token_id' => $tokenRecord->id,
            'mode' => $mode,
        ]);

        return $tokenRecord;
    }

    /**
     * Revoke the active delegated link for a fixture.
     */
    public function revokeToken(Fixture $fixture, int $organizerId): void
    {
        MatchDelegatedToken::query()
            ->where('fixture_id', $fixture->id)
            ->where('is_revoked', false)
            ->update([
                'is_revoked' => true,
                'revoked_at' => now(),
                'status' => 'revoked',
            ]);

        $this->audit($fixture->match_id ? FootballMatch::find($fixture->match_id) : null, $fixture, 'delegated_link_revoked', $organizerId, []);
    }

    /**
     * Validate a token and return the model.
     * Rejects invalid, revoked, or expired tokens with a generic exception.
     */
    public function findValidToken(string $plainToken, ?string $clientIp = null): MatchDelegatedToken
    {
        $hash = hash('sha256', $plainToken);

        $tokenRecord = MatchDelegatedToken::query()
            ->with(['fixture.homeTeam', 'fixture.awayTeam', 'fixture.stadium', 'fixture.competition', 'fixture.group'])
            ->where('token_hash', $hash)
            ->first();

        if (! $tokenRecord || ! $tokenRecord->isValid()) {
            throw new DomainException('الرابط غير صالح أو انتهت صلاحيته', 404);
        }

        // Track IP for multi-device / IP anomaly detection
        if ($clientIp) {
            $ips = $tokenRecord->ip_addresses ?? [];
            if (! in_array($clientIp, $ips, true)) {
                $ips[] = $clientIp;
                $tokenRecord->ip_addresses = $ips;
                $tokenRecord->save();
            }
        }

        if (! $tokenRecord->first_opened_at) {
            $tokenRecord->first_opened_at = now();
            $tokenRecord->save();
        }

        return $tokenRecord;
    }

    /**
     * Identify the recorder (name & phone) upon first interaction.
     */
    public function identifyRecorder(MatchDelegatedToken $token, string $name, string $phone): void
    {
        $token->update([
            'recorder_name' => trim($name),
            'recorder_phone' => trim($phone),
        ]);
    }

    /**
     * Add a player to one of the fixture teams via the delegated link.
     * Enforces the tournament maximum roster limit in the backend.
     * Prevents duplicates (asks confirmation if same name exists).
     * Locks the player from delegate edit/removal.
     * Attaches player to tournament squad and match lineup.
     * Writes to audit log.
     *
     * @return array{created: bool, duplicate: bool, player: ?array, duplicates: array, message: string}
     */
    public function addPlayer(MatchDelegatedToken $token, int $teamId, string $name, ?int $number = null, ?int $existingPlayerId = null, bool $force = false): array
    {
        $fixture = $token->fixture;
        if (! $fixture) {
            throw new DomainException('المباراة غير موجودة');
        }

        if (! $token->isValid()) {
            throw new DomainException('الرابط غير صالح أو انتهت صلاحيته');
        }

        // Verify team belongs to this match
        if ($teamId !== (int) $fixture->home_team_id && $teamId !== (int) $fixture->away_team_id) {
            throw new DomainException('هذا الفريق غير مشارك في هذه المباراة', 422);
        }

        $team = Team::findOrFail($teamId);

        $tournament = $fixture->competition instanceof Tournament
            ? $fixture->competition
            : ($fixture->competition_id ? Tournament::find($fixture->competition_id) : null);

        // Check backend tournament roster maximum
        if ($tournament) {
            $max = $this->squadService->maxPlayers($tournament);
            $currentSquadCount = $this->squadService->squadCount($tournament, $team);
            if ($max !== null && $currentSquadCount >= $max) {
                throw new DomainException("تم الوصول للحد الأقصى للاعبي الفريق في البطولة ({$max} لاعبين). لا يمكن إضافة المزيد.", 422);
            }
        }

        // Case A: Picking an existing roster player who is not yet in the tournament squad or lineup
        if ($existingPlayerId) {
            $player = Player::where('team_id', $teamId)->where('id', $existingPlayerId)->first();
            if (! $player) {
                throw new DomainException('اللاعب غير موجود في قائمة الفريق', 404);
            }

            if ($tournament) {
                TournamentSquadMember::firstOrCreate([
                    'tournament_id' => $tournament->id,
                    'team_id' => $teamId,
                    'player_id' => $player->id,
                ]);
            }

            // Add to match presence / lineup if match exists
            if ($fixture->match_id) {
                MatchLineup::firstOrCreate([
                    'match_id' => $fixture->match_id,
                    'team_id' => $teamId,
                    'player_id' => $player->id,
                ], [
                    'is_starter' => false,
                ]);
            }

            $this->audit($fixture->match_id ? FootballMatch::find($fixture->match_id) : null, $fixture, 'delegated_player_picked', null, [
                'token_id' => $token->id,
                'team_id' => $teamId,
                'player_id' => $player->id,
                'player_name' => $player->name,
                'recorder_name' => $token->recorder_name,
                'recorder_phone' => $token->recorder_phone,
            ]);

            return [
                'created' => true,
                'duplicate' => false,
                'player' => [
                    'id' => $player->id,
                    'team_id' => $player->team_id,
                    'name' => $player->name,
                    'number' => $player->number,
                    'position' => $player->position,
                    'photo_url' => $player->photo_thumbnail_url ?? $player->photo_url,
                ],
                'duplicates' => [],
                'message' => 'تمت إضافة اللاعب إلى تشكيلة المباراة بنجاح',
            ];
        }

        // Case B: Adding a new player
        $trimmedName = trim($name);
        if ($trimmedName === '') {
            throw new DomainException('اسم اللاعب مطلوب', 422);
        }

        // Check for duplicates with same name in same team
        $duplicates = Player::query()
            ->where('team_id', $teamId)
            ->where('name', $trimmedName)
            ->get(['id', 'team_id', 'name', 'number', 'position']);

        if ($duplicates->isNotEmpty() && ! $force) {
            return [
                'created' => false,
                'duplicate' => true,
                'player' => null,
                'duplicates' => $duplicates->values()->all(),
                'message' => 'يوجد لاعب مسجل بالفعل بهذا الاسم في الفريق. هل تريد تأكيد إضافته أو اختيار اللاعب الموجود؟',
            ];
        }

        return DB::transaction(function () use ($token, $fixture, $tournament, $team, $trimmedName, $number) {
            $player = Player::create([
                'team_id' => $team->id,
                'name' => $trimmedName,
                'number' => $number !== null && $number >= 0 ? (int) $number : null,
                'status' => Player::STATUS_ACTIVE,
                'added_via_link' => true,
                'added_via_token_id' => $token->id,
                'added_via_fixture_id' => $fixture->id,
                'link_reviewed' => false,
                'is_locked_from_delegates' => true,
                'added_by_recorder_name' => $token->recorder_name,
                'added_by_recorder_phone' => $token->recorder_phone,
            ]);

            if ($tournament) {
                TournamentSquadMember::firstOrCreate([
                    'tournament_id' => $tournament->id,
                    'team_id' => $team->id,
                    'player_id' => $player->id,
                ]);
            }

            // Ensure match lineup entry exists if match record is present
            if ($fixture->match_id) {
                MatchLineup::firstOrCreate([
                    'match_id' => $fixture->match_id,
                    'team_id' => $team->id,
                    'player_id' => $player->id,
                ], [
                    'is_starter' => false,
                ]);
            }

            $this->audit($fixture->match_id ? FootballMatch::find($fixture->match_id) : null, $fixture, 'delegated_player_added', null, [
                'token_id' => $token->id,
                'team_id' => $team->id,
                'player_id' => $player->id,
                'player_name' => $player->name,
                'player_number' => $player->number,
                'recorder_name' => $token->recorder_name,
                'recorder_phone' => $token->recorder_phone,
            ]);

            return [
                'created' => true,
                'duplicate' => false,
                'player' => [
                    'id' => $player->id,
                    'team_id' => $player->team_id,
                    'name' => $player->name,
                    'number' => $player->number,
                    'position' => $player->position,
                    'photo_url' => $player->photo_thumbnail_url ?? $player->photo_url,
                ],
                'duplicates' => [],
                'message' => 'تمت إضافة اللاعب بنجاح إلى الفريق وتشكيلة المباراة',
            ];
        });
    }

    /**
     * Submit match result and events via delegated link.
     * Saved strictly as pending ("بانتظار الاعتماد"), NOT changing standings or official status.
     *
     * @param array<string, mixed> $payload
     */
    public function submitResult(
        MatchDelegatedToken $token,
        array $payload,
        ?string $clientIp = null,
        ?string $userAgent = null
    ): MatchDelegatedSubmission {
        $fixture = $token->fixture;

        if (! $fixture) {
            throw new DomainException('المباراة غير موجودة');
        }

        if (! $token->isValid()) {
            throw new DomainException('الرابط غير صالح أو انتهت صلاحيته');
        }

        $homeScore = (int) ($payload['home_score'] ?? 0);
        $awayScore = (int) ($payload['away_score'] ?? 0);
        $recorderName = trim((string) ($payload['recorder_name'] ?? $token->recorder_name ?? ''));
        $recorderPhone = trim((string) ($payload['recorder_phone'] ?? $token->recorder_phone ?? ''));

        if ($recorderName === '' || $recorderPhone === '') {
            throw new DomainException('الاسم ورقم الهاتف مطلوبان لتسجيل المباراة');
        }

        // Detect Anomalies
        $anomalies = [];

        // 1. Unusual score (total goals >= 10)
        if (($homeScore + $awayScore) >= self::DEFAULT_ANOMALY_SCORE_THRESHOLD) {
            $anomalies[] = 'unusual_score';
        }

        // 2. Events/Result submitted after scheduled window
        $scheduledAt = $fixture->scheduled_at ? Carbon::parse($fixture->scheduled_at, self::TIMEZONE) : null;
        if ($scheduledAt && now(self::TIMEZONE)->gt($scheduledAt->copy()->addHours(5))) {
            $anomalies[] = 'recorded_after_window';
        }

        // 3. Link used from more than one IP
        $ips = $token->ip_addresses ?? [];
        if ($clientIp && ! in_array($clientIp, $ips, true)) {
            $ips[] = $clientIp;
        }
        if (count($ips) > 1) {
            $anomalies[] = 'multi_device_or_ip';
        }

        return DB::transaction(function () use (
            $token,
            $fixture,
            $homeScore,
            $awayScore,
            $payload,
            $recorderName,
            $recorderPhone,
            $anomalies,
            $clientIp,
            $userAgent
        ) {
            // Update token with recorder identity and status
            $token->update([
                'recorder_name' => $recorderName,
                'recorder_phone' => $recorderPhone,
                'status' => 'submitted',
            ]);

            // Save or update pending submission for this fixture
            $submission = MatchDelegatedSubmission::updateOrCreate(
                [
                    'fixture_id' => $fixture->id,
                    'status' => 'pending',
                ],
                [
                    'match_delegated_token_id' => $token->id,
                    'home_score' => $homeScore,
                    'away_score' => $awayScore,
                    'home_penalties' => isset($payload['home_penalties']) ? (int) $payload['home_penalties'] : null,
                    'away_penalties' => isset($payload['away_penalties']) ? (int) $payload['away_penalties'] : null,
                    'extra_time' => (bool) ($payload['extra_time'] ?? false),
                    'notes' => $payload['notes'] ?? null,
                    'events' => $payload['events'] ?? [],
                    'recorder_name' => $recorderName,
                    'recorder_phone' => $recorderPhone,
                    'anomalies' => array_values(array_unique($anomalies)),
                    'client_meta' => [
                        'ip' => $clientIp,
                        'user_agent' => $userAgent,
                        'submitted_at' => now()->toIso8601String(),
                        'presence' => $payload['presence'] ?? null,
                    ],
                ]
            );

            $tournament = $fixture->competition instanceof Tournament
                ? $fixture->competition
                : ($fixture->competition_id ? Tournament::find($fixture->competition_id) : null);

            if ($tournament && $this->foulRules->active($tournament)) {
                $this->foulRules->processFoulsForDelegatedSubmission(
                    $tournament,
                    $fixture,
                    $submission,
                    $payload['events'] ?? []
                );
            }

            // Audit the delegated submission
            $this->audit($fixture->match_id ? FootballMatch::find($fixture->match_id) : null, $fixture, 'delegated_result_submitted', null, [
                'submission_id' => $submission->id,
                'token_id' => $token->id,
                'recorder_name' => $recorderName,
                'recorder_phone' => $recorderPhone,
                'score' => "{$homeScore} - {$awayScore}",
                'anomalies' => $anomalies,
            ]);

            // Notify both team managers about the recorded score with objection capability
            $this->notifyTeamManagers($fixture, $submission);

            return $submission;
        });
    }

    /**
     * Committee action: Approve the pending delegated submission.
     * Makes the result official, applies bracket/standings, and locks the match.
     *
     * @param array<string, mixed>|null $overrideData Optional edits by committee before approval
     */
    public function approveSubmission(
        Fixture $fixture,
        int $organizerId,
        ?array $overrideData = null
    ): Fixture {
        $submission = MatchDelegatedSubmission::query()
            ->where('fixture_id', $fixture->id)
            ->where('status', 'pending')
            ->first();

        if (! $submission) {
            throw new DomainException('لا يوجد نتيجة معلقة للاعتماد');
        }

        return DB::transaction(function () use ($fixture, $submission, $organizerId, $overrideData) {
            $dataToApply = [
                'home_score' => $overrideData['home_score'] ?? $submission->home_score,
                'away_score' => $overrideData['away_score'] ?? $submission->away_score,
                'home_penalties' => $overrideData['home_penalties'] ?? $submission->home_penalties,
                'away_penalties' => $overrideData['away_penalties'] ?? $submission->away_penalties,
                'extra_time' => $overrideData['extra_time'] ?? $submission->extra_time,
                'notes' => $overrideData['notes'] ?? $submission->notes,
                'events' => $overrideData['events'] ?? $submission->events ?? [],
                'status' => 'finished',
                'force' => true,
            ];

            // Apply via official TournamentResultService
            $updatedFixture = $this->resultService->updateResult($fixture, $dataToApply, $organizerId);

            $tournament = $fixture->competition instanceof Tournament
                ? $fixture->competition
                : ($fixture->competition_id ? Tournament::find($fixture->competition_id) : null);

            if ($tournament && $this->foulRules->active($tournament)) {
                $this->foulRules->processFoulsForDelegatedSubmission(
                    $tournament,
                    $updatedFixture,
                    $submission,
                    $dataToApply['events']
                );
            }

            // Mark submission approved
            $submission->update([
                'status' => 'approved',
                'reviewed_by' => $organizerId,
                'reviewed_at' => now(),
            ]);

            // Mark token as approved (locked/read-only)
            if ($submission->token) {
                $submission->token->update(['status' => 'approved']);
            }

            // Audit
            $this->audit($updatedFixture->match, $fixture, 'delegated_result_approved', $organizerId, [
                'submission_id' => $submission->id,
                'approved_score' => "{$dataToApply['home_score']} - {$dataToApply['away_score']}",
                'was_edited' => ! empty($overrideData),
            ]);

            return $updatedFixture;
        });
    }

    /**
     * Committee action: Reject the pending delegated submission.
     * Discards the submission and keeps the match unplayed.
     */
    public function rejectSubmission(
        Fixture $fixture,
        int $organizerId,
        ?string $rejectionReason = null
    ): void {
        $submission = MatchDelegatedSubmission::query()
            ->where('fixture_id', $fixture->id)
            ->where('status', 'pending')
            ->first();

        if (! $submission) {
            throw new DomainException('لا يوجد نتيجة معلقة للرفض');
        }

        DB::transaction(function () use ($fixture, $submission, $organizerId, $rejectionReason) {
            $submission->update([
                'status' => 'rejected',
                'reviewed_by' => $organizerId,
                'reviewed_at' => now(),
                'rejection_reason' => $rejectionReason,
            ]);

            if ($submission->token) {
                $submission->token->update(['status' => 'rejected']);
            }

            $this->audit($fixture->match_id ? FootballMatch::find($fixture->match_id) : null, $fixture, 'delegated_result_rejected', $organizerId, [
                'submission_id' => $submission->id,
                'reason' => $rejectionReason,
            ]);
        });
    }

    /**
     * Team manager action: Object to the submitted delegated score.
     * Marks the submission as disputed and alerts the organizer.
     */
    public function disputeSubmission(
        Fixture $fixture,
        int $managerUserId,
        int $teamId,
        string $reason
    ): MatchDelegatedSubmission {
        $submission = MatchDelegatedSubmission::query()
            ->where('fixture_id', $fixture->id)
            ->where('status', 'pending')
            ->first();

        if (! $submission) {
            throw new DomainException('لا يوجد نتيجة معلقة للاعتراض عليها');
        }

        $submission->update([
            'is_disputed' => true,
            'dispute_reason' => trim($reason),
            'disputed_by_team_id' => $teamId,
            'disputed_by_user_id' => $managerUserId,
            'disputed_at' => now(),
        ]);

        // Audit
        $this->audit($fixture->match_id ? FootballMatch::find($fixture->match_id) : null, $fixture, 'delegated_result_disputed', $managerUserId, [
            'submission_id' => $submission->id,
            'team_id' => $teamId,
            'reason' => $reason,
        ]);

        return $submission;
    }

    /**
     * Notify both team managers when a delegated score is submitted.
     */
    private function notifyTeamManagers(Fixture $fixture, MatchDelegatedSubmission $submission): void
    {
        $homeTeam = $fixture->homeTeam;
        $awayTeam = $fixture->awayTeam;

        $homeManagerId = $homeTeam?->manager_id;
        $awayManagerId = $awayTeam?->manager_id;

        $scoreText = "{$submission->home_score} - {$submission->away_score}";
        $title = 'تسجيل نتيجة مباراة: ' . ($homeTeam?->name ?? 'الفريق 1') . ' ضد ' . ($awayTeam?->name ?? 'الفريق 2');
        $body = "تم تسجيل النتيجة ({$scoreText}) عبر مندوب المباراة بانتظار اعتماد اللجنة. يمكنك مراجعتها والاعتراض في حال وجود خطأ.";

        foreach (array_filter([$homeManagerId, $awayManagerId]) as $mgrId) {
            NotificationService::push(
                userId: $mgrId,
                type: 'score_submitted',
                title: $title,
                body: $body,
                data: [
                    'fixture_id' => $fixture->id,
                    'submission_id' => $submission->id,
                    'home_score' => $submission->home_score,
                    'away_score' => $submission->away_score,
                ],
                important: true
            );
        }
    }

    /**
     * Record a standardized audit entry.
     *
     * @param array<string, mixed> $changes
     */
    private function audit(?FootballMatch $match, Fixture $fixture, string $action, ?int $userId, array $changes = []): void
    {
        MatchResultAudit::create([
            'match_id' => $match?->id ?? $fixture->match_id,
            'fixture_id' => $fixture->id,
            'user_id' => $userId,
            'action' => $action,
            'description' => match ($action) {
                'delegated_link_generated' => 'تم إنشاء رابط تسجيل مندوب المباراة',
                'delegated_link_revoked' => 'تم إلغاء رابط تسجيل مندوب المباراة',
                'delegated_result_submitted' => 'تم إرسال نتيجة المباراة عبر الرابط السري',
                'delegated_result_approved' => 'تم اعتماد النتيجة المرسلة من المندوب',
                'delegated_result_rejected' => 'تم رفض النتيجة المرسلة من المندوب',
                'delegated_result_disputed' => 'تم تسجيل اعتراض على النتيجة من مدير الفريق',
                default => $action,
            },
            'changes' => $changes,
        ]);
    }
}
