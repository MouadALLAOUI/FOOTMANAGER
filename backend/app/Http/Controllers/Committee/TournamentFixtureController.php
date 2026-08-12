<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Resources\TournamentFixtureResource;
use App\Domains\Tournament\Services\TournamentFixtureService;
use App\Http\Requests\Committee\GenerateFixturesRequest;
use App\Http\Requests\Committee\RescheduleFixtureRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TournamentFixtureController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly TournamentFixtureService $fixtures,
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
            ->with(['round', 'group', 'homeTeam', 'awayTeam', 'stadium', 'match']);

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

        return TournamentFixtureResource::collection($query->get());
    }

    public function matchRounds(Tournament $tournament): JsonResponse
    {
        $this->authorize('view', $tournament);

        return response()->json(['data' => $this->fixtures->matchRounds($tournament)]);
    }

    public function store(GenerateFixturesRequest $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if ($tournament->status === 'finished') {
            throw new DomainException('لا يمكن إنشاء برنامج بعد انتهاء البطولة');
        }

        $data = $request->validated();

        if ($request->boolean('regenerate')) {
            $result = $this->fixtures->regenerateGroupFixtures(
                $tournament,
                $data['starts_on'] ?? null,
                $data['stadium_ids'] ?? null,
                $data['default_time'] ?? '20:00',
                (bool) ($data['double_round_robin'] ?? false),
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

    public function reschedule(RescheduleFixtureRequest $request, Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);
        $this->assertBelongsToTournament($tournament, $fixture);

        if ($fixture->match?->status === MatchStatus::Finished) {
            throw new DomainException('لا يمكن إعادة جدولة مباراة انتهت');
        }

        $data = $request->validated();

        $fixture->forceFill([
            'scheduled_at' => $data['scheduled_at'],
            'stadium_id' => $data['stadium_id'] ?? $fixture->stadium_id,
            'status' => FixtureStatus::Scheduled,
        ])->save();

        if ($fixture->match) {
            $fixture->match->forceFill(['status' => MatchStatus::Scheduled])->save();
        }

        return response()->json([
            'data' => new TournamentFixtureResource($fixture->load(['round', 'group', 'homeTeam', 'awayTeam', 'stadium', 'match'])),
            'message' => 'تمت إعادة جدولة المباراة',
        ]);
    }

    public function postpone(Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);
        $this->assertBelongsToTournament($tournament, $fixture);

        $this->assertNotFinished($fixture);

        $fixture->forceFill(['status' => FixtureStatus::Postponed])->save();

        if ($fixture->match) {
            $fixture->match->forceFill(['status' => MatchStatus::Postponed])->save();
        }

        return response()->json(['message' => 'تم تأجيل المباراة']);
    }

    public function cancel(Tournament $tournament, Fixture $fixture): JsonResponse
    {
        $this->authorize('manage', $tournament);
        $this->assertBelongsToTournament($tournament, $fixture);

        $this->assertNotFinished($fixture);

        $fixture->forceFill(['status' => FixtureStatus::Cancelled])->save();

        if ($fixture->match) {
            $fixture->match->forceFill(['status' => MatchStatus::Cancelled])->save();
        }

        return response()->json(['message' => 'تم إلغاء المباراة']);
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
}
