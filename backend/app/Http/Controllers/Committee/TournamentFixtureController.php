<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Enums\RoundStage;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use App\Domains\Tournament\Resources\TournamentFixtureResource;
use App\Domains\Tournament\Resources\TournamentLiveFixtureResource;
use App\Domains\Tournament\Services\TournamentFixtureService;
use App\Domains\Tournament\Services\TournamentTerrainBookingService;
use App\Domains\Tournament\Services\TerrainReservationService;
use App\Domains\Tournament\Services\TournamentBracketService;
use App\Http\Requests\Committee\GenerateFixturesRequest;
use App\Http\Requests\Committee\RescheduleFixtureRequest;
use App\Http\Requests\Committee\UpdateFixtureSlotRequest;
use App\Http\Requests\Committee\UpdateFixtureSlotsRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

class TournamentFixtureController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly TournamentFixtureService $fixtures,
        private readonly TournamentTerrainBookingService $bookings,
        private readonly TerrainReservationService $reservations,
        private readonly TournamentBracketService $bracket,
    ) {}

    /**
     * List fixtures. Supports filtering to a single round:
     * ?matchday=1 for a group-stage matchday, ?round_id= for a knockout round,
     * or ?stage= for all fixtures of a stage.
     */
    public function index(Request $request, Tournament $tournament): AnonymousResourceCollection
    {
        $this->authorize('view', $tournament);

        $query = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->with(['round', 'group', 'homeTeam', 'awayTeam', 'byeTeam', 'stadium', 'match']);

        $matchday = $request->integer('matchday');
        $roundId = $request->integer('round_id');
        $stage = $request->string('stage')->toString();

        if ($matchday > 0) {
            $query->where('matchday', $matchday)->orderBy('group_id')->orderBy('id');
        } elseif ($roundId > 0) {
            $query->where('round_id', $roundId)->orderBy('id');
        } elseif ($stage !== '') {
            $query->whereHas('round', fn ($q) => $q->where('stage', $stage))->orderBy('id');
        } else {
            $query->whereNotNull('matchday')->orderBy('matchday')->orderBy('group_id')->orderBy('id');
        }

        $fixtures = $query->get();

        $this->decorateSlotTypes($tournament, $fixtures);

        return TournamentFixtureResource::collection($fixtures);
    }

    /**
     * Live matches for this tournament, with a recent-events feed — used by the
     * committee "live match + activity" section.
     */
    public function live(Tournament $tournament): AnonymousResourceCollection
    {
        $this->authorize('view', $tournament);

        $fixtures = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->whereHas('match', fn ($q) => $q->whereIn('status', MatchStatus::live()))
            ->with([
                'round', 'group', 'homeTeam', 'awayTeam', 'stadium',
                'match.events' => fn ($q) => $q->orderByDesc('created_at')->limit(15),
                'match.events.team', 'match.events.player', 'match.events.assistPlayer',
            ])
            ->orderBy('scheduled_at')
            ->orderBy('id')
            ->get();

        return TournamentLiveFixtureResource::collection($fixtures);
    }

    /**
     * Create the fixture LAYOUT (empty team slots) — the manual-draft
     * counterpart of store()/auto-generation. The committee fills each slot
     * afterwards through assignSlot().
     */
    public function storeLayout(GenerateFixturesRequest $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if ($tournament->status === Tournament::STATUS_COMPLETED || $tournament->isCancelled() || $tournament->hasSettledResult()) {
            throw new DomainException('لا يمكن إنشاء برنامج بعد تسجيل أول نتيجة');
        }

        $data = $request->validated();
        $stage = $data['stage'] ?? 'group';

        if ($stage === 'knockout') {
            $result = $this->fixtures->generateKnockoutLayout(
                $tournament,
                $data['starts_on'] ?? null,
                $data['stadium_ids'] ?? null,
                $data['default_time'] ?? '20:00',
            );

            return response()->json([
                'data' => $result,
                'message' => 'تم إنشاء هيكل الأدوار الإقصائية — ضع الفرق على المباريات يدوياً',
            ], 201);
        }

        $this->assertDrawReadyForFixtures($tournament);

        if ($request->boolean('regenerate')) {
            $this->fixtures->deleteGroupFixtures($tournament);
        } else {
            $existing = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->whereNotNull('group_id')
                ->count();

            if ($existing > 0) {
                throw new DomainException('هيكل دور المجموعات موجود مسبقاً، استخدم إعادة الإنشاء إذا أردت استبداله');
            }
        }

        $result = $this->fixtures->generateGroupLayout(
            $tournament,
            $data['starts_on'] ?? null,
            $data['stadium_ids'] ?? null,
            $data['default_time'] ?? '20:00',
            (bool) ($data['double_round_robin'] ?? false),
        );

        return response()->json([
            'data' => $result,
            'message' => 'تم إنشاء هيكل دور المجموعات — ضع الفرق على المباريات يدوياً',
        ], 201);
    }

    /**
     * Assign (or clear) a team on a fixture slot. side = home | away | bye.
     */
    public function assignSlot(UpdateFixtureSlotRequest $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);
        $this->assertBelongsToTournament($tournament, $fixture);

        $data = $request->validated();

        $fixture = $this->fixtures->assignSlot(
            $tournament,
            $fixture,
            $data['side'],
            $data['team_id'] ?? null,
        )->load(['round', 'group', 'homeTeam', 'awayTeam', 'byeTeam', 'stadium', 'match']);

        $this->decorateSlotTypes($tournament, collect([$fixture]));

        $message = $data['team_id'] === null
            ? 'تم إفراغ الموقع'
            : 'تم تعيين الفريق على الموقع';

        return response()->json([
            'data' => new TournamentFixtureResource($fixture),
            'message' => $message,
        ]);
    }

    /**
     * Persist several manual slot changes in one atomic request.
     */
    public function assignSlots(UpdateFixtureSlotsRequest $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $slots = $request->validated('slots');

        $updated = $this->fixtures->assignSlots($tournament, $slots);

        foreach ($updated as $fixture) {
            $this->assertBelongsToTournament($tournament, $fixture);
        }

        $fixtures = $updated
            ->map(fn (Fixture $f) => $f->load(['round', 'group', 'homeTeam', 'awayTeam', 'byeTeam', 'stadium', 'match']));
        $this->decorateSlotTypes($tournament, $fixtures);

        return response()->json([
            'data' => TournamentFixtureResource::collection($fixtures),
            'message' => 'تم حفظ تغييرات التعبئة',
        ]);
    }

    public function matchRounds(Tournament $tournament): JsonResponse
    {
        $this->authorize('view', $tournament);

        return response()->json(['data' => $this->fixtures->matchRounds($tournament)]);
    }

    public function knockoutQualified(Tournament $tournament): JsonResponse
    {
        $this->authorize('view', $tournament);

        return response()->json(['data' => $this->fixtures->qualifiedTeamsDetailed($tournament)]);
    }

    /**
     * Tournament-capable terrains filtered/annotated server-side for the given
     * slot (?date=Y-m-d&time=H:i), so the committee picker only sees relevant
     * terrains and their availability.
     */
    public function terrains(Request $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('view', $tournament);

        return response()->json([
            'data' => $this->fixtures->tournamentTerrains(
                $tournament,
                $request->query('date') ?: null,
                $request->query('time') ?: null,
            ),
        ]);
    }

    public function preview(GenerateFixturesRequest $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if ($tournament->status === Tournament::STATUS_COMPLETED || $tournament->isCancelled() || $tournament->hasSettledResult()) {
            throw new DomainException('لا يمكن إنشاء برنامج بعد تسجيل أول نتيجة');
        }

        $data = $request->validated();
        $stage = $data['stage'] ?? 'group';

        $result = $stage === 'knockout'
            ? $this->fixtures->previewKnockoutFixtures(
                $tournament,
                $data['team_ids'] ?? [],
                $data['starts_on'] ?? null,
                $data['stadium_ids'] ?? null,
                $data['default_time'] ?? '20:00',
            )
            : $this->fixtures->previewGroupFixtures(
                $tournament,
                $data['starts_on'] ?? null,
                $data['stadium_ids'] ?? null,
                $data['default_time'] ?? '20:00',
                (bool) ($data['double_round_robin'] ?? false),
            );

        return response()->json(['data' => $result]);
    }

    public function store(GenerateFixturesRequest $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if ($tournament->status === Tournament::STATUS_COMPLETED || $tournament->isCancelled() || $tournament->hasSettledResult()) {
            throw new DomainException('لا يمكن إنشاء برنامج بعد تسجيل أول نتيجة');
        }

        $data = $request->validated();
        $stage = $data['stage'] ?? 'group';
        $strategy = $data['conflict_strategy'] ?? TournamentFixtureService::STRATEGY_ABORT;

        if ($stage === 'knockout') {
            $existingKnockout = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->whereHas('round', fn ($q) => $q->where('stage', '!=', 'group'))
                ->exists();

            if ($existingKnockout && ! $request->boolean('regenerate')) {
                throw new DomainException('برنامج الأدوار الإقصائية موجود مسبقاً، استخدم إعادة الإنشاء إذا أردت استبداله');
            }

            $result = $this->fixtures->generateKnockoutFixtures(
                $tournament,
                $data['team_ids'] ?? [],
                $data['starts_on'] ?? null,
                $data['stadium_ids'] ?? null,
                $data['default_time'] ?? '20:00',
                $strategy,
            );

            return response()->json([
                'data' => $result,
                'message' => "تم إنشاء {$result['generated']} مباراة في الأدوار الإقصائية",
            ], 201);
        }

        $this->assertDrawReadyForFixtures($tournament);

        if ($request->boolean('regenerate')) {
            $result = $this->fixtures->regenerateGroupFixtures(
                $tournament,
                $data['starts_on'] ?? null,
                $data['stadium_ids'] ?? null,
                $data['default_time'] ?? '20:00',
                (bool) ($data['double_round_robin'] ?? false),
                $strategy,
            );
        } else {
            $existing = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->where('season_id', $tournament->season_id)
                ->whereNotNull('group_id')
                ->count();

            if ($existing > 0) {
                throw new DomainException('برنامج المباريات موجود مسبقاً، استخدم إعادة الإنشاء إذا أردت استبداله');
            }

            $result = $this->fixtures->generateGroupFixtures(
                $tournament,
                $data['starts_on'] ?? null,
                $data['stadium_ids'] ?? null,
                $data['default_time'] ?? '20:00',
                (bool) ($data['double_round_robin'] ?? false),
                $strategy,
            );
        }

        return response()->json([
            'data' => $result,
            'message' => "تم إنشاء {$result['generated']} مباراة في دور المجموعات",
        ], 201);
    }

    public function destroy(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if ($tournament->matches()->where('status', MatchStatus::Finished)->exists()) {
            throw new DomainException('لا يمكن حذف البرنامج بعد بدء المباريات');
        }

        $deleted = $this->fixtures->deleteGroupFixtures($tournament);

        return response()->json(['message' => "تم حذف $deleted مباراة"]);
    }

    /**
     * Delete the knockout bracket only, as long as none of its matches have
     * started (finished or live).
     */
    public function destroyKnockout(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $played = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->whereHas('round', fn ($q) => $q->where('stage', '!=', RoundStage::Group->value))
            ->whereHas('match', fn ($q) => $q->whereIn('status', [MatchStatus::Finished->value, ...MatchStatus::live()]))
            ->exists();

        if ($played) {
            throw new DomainException('لا يمكن حذف السلم بعد بدء مباريات الأدوار الإقصائية');
        }

        $deleted = $this->fixtures->deleteKnockoutFixtures($tournament);

        return response()->json(['message' => "تم حذف $deleted مباراة من السلم"]);
    }

    public function reschedule(RescheduleFixtureRequest $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);
        $this->assertBelongsToTournament($tournament, $fixture);

        if ($fixture->match?->status === MatchStatus::Finished) {
            throw new DomainException('لا يمكن إعادة جدولة مباراة انتهت');
        }

        $data = $request->validated();

        // INDEPENDENT mode keeps the legacy behaviour: validate the slot and
        // auto-claim. INTEGRATED mode saves a draft and releases the previous
        // reservation so the owner calendar is never double-booked.
        if (! $tournament->usesIntegratedTerrainReservations()) {
            $this->fixtures->assertRescheduleAvailable(
                $data['stadium_id'] ?? $fixture->stadium_id,
                Carbon::parse($data['scheduled_at']),
                (int) ($fixture->home_team_id ?? 0),
                (int) ($fixture->away_team_id ?? 0),
                $fixture->match_id,
            );
        }

        $result = $this->reservations->saveSchedule(
            $tournament,
            $fixture,
            Carbon::parse($data['scheduled_at']),
            $data['stadium_id'] ?? $fixture->stadium_id,
        );

        return response()->json([
            'data' => new TournamentFixtureResource($result['fixture']->load(['round', 'group', 'homeTeam', 'awayTeam', 'stadium', 'match'])),
            'message' => $result['message'],
            'reservation_outcome' => $result['outcome'],
        ]);
    }

    /**
     * Commit the draft slot in INTEGRATED mode: re-validates the slot atomically
     * and claims the reservation, marking the match confirmed. Never double-books
     * the Terrain Owner's calendar.
     */
    public function confirmReservation(Request $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);
        $this->assertBelongsToTournament($tournament, $fixture);

        if (! $tournament->usesIntegratedTerrainReservations()) {
            throw new DomainException('وضع الحجز المستقل لا يتطلب تأكيداً — الحجز مفعّل تلقائياً');
        }

        $result = $this->reservations->confirm($fixture);

        return response()->json([
            'data' => new TournamentFixtureResource($result['fixture']->load(['round', 'group', 'homeTeam', 'awayTeam', 'stadium', 'match'])),
            'message' => $result['message'],
            'reservation_outcome' => $result['outcome'],
        ]);
    }

    public function postpone(Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);
        $this->assertBelongsToTournament($tournament, $fixture);

        $this->assertNotFinished($fixture);

        $fixture->forceFill(['status' => FixtureStatus::Postponed])->save();

        if ($fixture->match) {
            $fixture->match->forceFill([
                'status' => MatchStatus::Postponed,
                'is_confirmed' => false,
                'active_reservation_id' => null,
            ])->save();
        }

        $this->bookings->archiveForFixture($fixture);

        return response()->json(['message' => 'تم تأجيل المباراة']);
    }

    public function cancel(Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);
        $this->assertBelongsToTournament($tournament, $fixture);

        $this->assertNotFinished($fixture);

        $fixture->forceFill(['status' => FixtureStatus::Cancelled])->save();

        if ($fixture->match) {
            $fixture->match->forceFill([
                'status' => MatchStatus::Cancelled,
                'is_confirmed' => false,
                'active_reservation_id' => null,
            ])->save();
        }

        $this->bookings->archiveForFixture($fixture);

        return response()->json(['message' => 'تم إلغاء المباراة']);
    }

    public function restore(Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);
        $this->assertBelongsToTournament($tournament, $fixture);

        if ($fixture->match?->status === MatchStatus::Finished) {
            throw new DomainException('لا يمكن استعادة مباراة انتهت');
        }

        $fixtureStatus = $fixture->status?->value;
        $matchStatus = $fixture->match?->status?->value;

        $isCancelledOrPostponed = in_array($fixtureStatus, [FixtureStatus::Cancelled->value, FixtureStatus::Postponed->value], true)
            || in_array($matchStatus, [MatchStatus::Cancelled->value, MatchStatus::Postponed->value], true);

        if (! $isCancelledOrPostponed) {
            throw new DomainException('المباراة ليست ملغاة أو مؤجلة');
        }

        $fixture->forceFill(['status' => FixtureStatus::Scheduled])->save();

        if ($tournament->usesIntegratedTerrainReservations()) {
            if ($fixture->match) {
                $fixture->match->forceFill([
                    'status' => MatchStatus::Scheduled,
                    'is_confirmed' => false,
                    'active_reservation_id' => null,
                ])->save();
            }

            $this->bookings->archiveForFixture($fixture);

            return response()->json([
                'data' => new TournamentFixtureResource($fixture->load(['round', 'group', 'homeTeam', 'awayTeam', 'stadium', 'match'])),
                'message' => 'تمت استعادة المباراة — أكّد الحجز لإشغال الملعب',
                'reservation_outcome' => TerrainReservationService::OUTCOME_DRAFT,
            ]);
        }

        if ($fixture->match) {
            $fixture->match->forceFill(['status' => MatchStatus::Scheduled])->save();
        }

        $booking = $this->bookings->syncFixture($tournament, $fixture);

        if ($fixture->match && $booking) {
            $fixture->match->forceFill([
                'is_confirmed' => true,
                'active_reservation_id' => $booking->id,
            ])->save();
        }

        return response()->json([
            'data' => new TournamentFixtureResource($fixture->load(['round', 'group', 'homeTeam', 'awayTeam', 'stadium', 'match'])),
            'message' => 'تمت استعادة المباراة',
        ]);
    }

    private function assertDrawReadyForFixtures(Tournament $tournament): void
    {
        if (! in_array($tournament->tournament_format, ['groups_knockout', 'groups_only'], true)) {
            return;
        }

        $unassigned = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->whereNull('group_id')
            ->exists();

        if ($unassigned) {
            throw new DomainException('وزّع جميع الفرق في المجموعات قبل إنشاء برنامج المباريات');
        }

        if ($tournament->draw_confirmed_at === null) {
            throw new DomainException('قم بتأكيد القرعة قبل إنشاء برنامج المباريات');
        }
    }

    private function assertBelongsToTournament(Tournament $tournament, Fixture $fixture): void
    {
        if ((int) $tournament->competition_id !== (int) $fixture->competition_id
            || (int) $tournament->season_id !== (int) $fixture->season_id) {
            throw new DomainException('المباراة لا تنتمي إلى هذه البطولة', 404);
        }
    }

    private function assertNotFinished(Fixture $fixture): void
    {
        if ($fixture->match?->status === MatchStatus::Finished) {
            throw new DomainException('لا يمكن تعديل مباراة انتهت');
        }
    }

    /**
     * Stamp the manual-layout slot type ('pair' | 'bye' | null) onto every
     * knockout fixture so the resource can expose it in one place.
     *
     * @param  \Illuminate\Support\Collection<int, Fixture>|array<int, Fixture>  $fixtures
     */
    private function decorateSlotTypes(Tournament $tournament, $fixtures): void
    {
        foreach ($fixtures as $fixture) {
            if (($fixture->round?->stage?->value) !== RoundStage::Group->value) {
                $fixture->setAttribute('slot_type', $this->bracket->slotType($tournament, $fixture));
            }
        }
    }
}
