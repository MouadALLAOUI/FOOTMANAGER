<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Competition\Enums\RoundStage;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Competition\Models\Round;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Services\TournamentBracketService;
use App\Domains\Tournament\Services\TournamentFixtureService;
use App\Domains\Tournament\Services\TournamentSetupService;
use App\Domains\Tournament\Services\TournamentStandingsService;
use App\Domains\Tournament\Services\TournamentSuspensionService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TournamentBracketController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly TournamentBracketService $bracket,
        private readonly TournamentStandingsService $standings,
        private readonly TournamentFixtureService $fixtures,
        private readonly TournamentSuspensionService $suspensions,
        private readonly TournamentSetupService $setup,
    ) {}

    public function index(Tournament $tournament): JsonResponse
    {
        $this->authorize('view', $tournament);

        return response()->json([
            'data' => $this->bracket->bracket($tournament),
            'meta' => $this->bracket->bracketMeta($tournament),
        ]);
    }

    /**
     * Pre-generation gate: how many teams enter the knockout and, for the
     * non-group formats, whether that count is valid, needs a 6-team choice or
     * is outright invalid.
     */
    public function validation(Tournament $tournament): JsonResponse
    {
        $this->authorize('view', $tournament);

        return response()->json(['data' => $this->bracket->knockoutValidation($tournament)]);
    }

    public function store(Request $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $mode = $request->input('mode');

        if ($mode !== null && ! in_array($mode, ['byes', 'groups6', 'playin', 'bye_final'], true)) {
            throw new DomainException('صيغة توليد السلم غير صالحة');
        }

        if ($mode === 'groups6') {
            return response()->json(['data' => $this->bracket->generateGroups6($tournament)], 201);
        }

        return response()->json(['data' => $this->bracket->generateBracket($tournament, $mode)], 201);
    }

    public function populate(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $mode = ($tournament->plan ?? [])['knockout']['mode'] ?? null;

        if ($mode === 'groups6') {
            return response()->json(['data' => $this->bracket->populateGroups6($tournament)]);
        }

        $qualified = $this->qualifiedTeams($tournament);

        return response()->json(['data' => $this->bracket->populateKnockout($tournament, $qualified, $mode)]);
    }

    /**
     * Idempotent recovery pass: recompute every knockout slot from its source
     * winners and refresh round states. Safe to run at any time.
     */
    public function sync(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        return response()->json(['data' => $this->bracket->progressAll($tournament)]);
    }

    /**
     * @return array<int, int>
     */
    private function qualifiedTeams(Tournament $tournament): array
    {
        // Strictly rely on the officially qualified teams from active participating groups
        $detailed = $this->fixtures->qualifiedTeamsDetailed($tournament);
        $teams = $detailed['teams'] ?? [];

        if (! empty($teams)) {
            return array_values(array_map(fn ($t) => (int) $t['team_id'], $teams));
        }

        $knockoutTeams = (int) $this->bracket->resolvedKnockoutTeams($tournament);
        $fallback = $this->bracket->knockoutTeamIds($tournament);

        return array_slice($fallback, 0, $knockoutTeams);
    }

    public function drawTeams(Tournament $tournament): JsonResponse
    {
        $this->authorize('view', $tournament);

        $detailed = $this->fixtures->qualifiedTeamsDetailed($tournament);
        $firstRoundId = $this->bracket->firstKnockoutRoundId($tournament);

        $firstRound = null;
        $fixtures = collect();

        if (! $firstRoundId && in_array($tournament->tournament_format, ['groups_knockout', 'groups_double_round_robin_knockout'], true)) {
            $groupDetails = $this->setup->groupStageDetails($tournament);
            $hasRealIncomplete = collect($groupDetails['incomplete_groups'] ?? [])
                ->contains(fn ($grp) => ($grp['remaining_matches'] ?? 0) > 0 && ($grp['total_matches'] ?? 0) > 0);

            if ($groupDetails['complete'] || ! $hasRealIncomplete) {
                try {
                    $this->bracket->generateBracket($tournament);
                    $firstRoundId = $this->bracket->firstKnockoutRoundId($tournament);
                } catch (\Throwable $e) {
                    // Ignore, will return empty fixtures if not yet ready
                }
            }
        }

        if ($firstRoundId) {
            $firstRound = Round::query()->find($firstRoundId);
            $fixtures = Fixture::query()
                ->with(['homeTeam', 'awayTeam'])
                ->where('round_id', $firstRoundId)
                ->orderBy('id')
                ->get();
        }

        $plan = $tournament->plan ?? [];
        $knockoutPlan = $plan['knockout'] ?? [];
        $groupDetails = $this->setup->groupStageDetails($tournament);
        $isComplete = $groupDetails['complete'] || empty($groupDetails['incomplete_groups']);

        return response()->json([
            'data' => [
                'qualified_teams' => $detailed['teams'] ?? [],
                'group_stage_details' => $groupDetails,
                'available_groups' => $groupDetails['groups'],
                'can_finalize_qualification' => $isComplete,
                'first_round' => $firstRound ? [
                    'id' => $firstRound->id,
                    'name' => $firstRound->name,
                    'stage' => $firstRound->stage->value,
                ] : null,
                'fixtures' => $fixtures->map(fn (Fixture $f) => [
                    'id' => $f->id,
                    'home_team_id' => $f->home_team_id,
                    'away_team_id' => $f->away_team_id,
                    'home_team' => $f->homeTeam ? ['id' => $f->homeTeam->id, 'name' => $f->homeTeam->name, 'logo_url' => $f->homeTeam->logo_url] : null,
                    'away_team' => $f->awayTeam ? ['id' => $f->awayTeam->id, 'name' => $f->awayTeam->name, 'logo_url' => $f->awayTeam->logo_url] : null,
                ]),
                'draw_status' => $knockoutPlan['draw_status'] ?? 'pending',
                'draw_confirmed_at' => $knockoutPlan['draw_confirmed_at'] ?? null,
                'draw_confirmed_by' => $knockoutPlan['draw_confirmed_by'] ?? null,
                'rules' => $knockoutPlan['rules'] ?? [
                    'prevent_same_group_r1' => true,
                ],
                'round_rules' => $knockoutPlan['round_rules'] ?? [],
            ],
        ]);
    }

    public function autoDrawProposal(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $proposal = $this->bracket->proposeAutomaticDraw($tournament);

        return response()->json([
            'data' => $proposal,
        ]);
    }

    public function confirmDraw(Request $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if (in_array($tournament->status, [Tournament::STATUS_COMPLETED, Tournament::STATUS_CANCELLED], true)) {
            throw new DomainException('لا يمكن تعديل القرعة لبطولة مكتملة أو ملغاة');
        }

        if (in_array($tournament->tournament_format, ['groups_knockout', 'groups_double_round_robin_knockout'], true)) {
            $details = $this->setup->groupStageDetails($tournament);
            $hasRealIncomplete = collect($details['incomplete_groups'] ?? [])
                ->contains(fn ($grp) => ($grp['remaining_matches'] ?? 0) > 0 && ($grp['total_matches'] ?? 0) > 0);

            if (! $details['complete'] && $hasRealIncomplete) {
                throw new DomainException($details['explanation'] ?? 'لا يمكن اعتماد القرعة قبل اكتمال جميع مباريات دور المجموعات');
            }
        }

        $assignments = $request->input('assignments', []);
        $preventSameGroup = (bool) $request->input('prevent_same_group_r1', true);

        if (empty($assignments) || ! is_array($assignments)) {
            throw new DomainException('يرجى تحديد مواجهات الدور الأول بالكامل');
        }

        $firstRoundId = $this->bracket->firstKnockoutRoundId($tournament);
        if (! $firstRoundId) {
            throw new DomainException('لم يتم إنشاء الدور الإقصائي الأول بعد');
        }

        $fixtures = Fixture::query()
            ->where('round_id', $firstRoundId)
            ->orderBy('id')
            ->get()
            ->keyBy('id');

        if ($fixtures->isEmpty()) {
            throw new DomainException('لا توجد مباريات في الدور الأول لتسكين الفرق فيها');
        }

        $assignedTeamIds = [];
        $detailed = $this->fixtures->qualifiedTeamsDetailed($tournament);
        $qualifiedMap = collect($detailed['teams'] ?? [])->keyBy('team_id');

        foreach ($assignments as $a) {
            $fixtureId = $a['fixture_id'] ?? null;
            $homeId = $a['home_team_id'] ?? null;
            $awayId = $a['away_team_id'] ?? null;

            if (! $fixtureId || ! isset($fixtures[$fixtureId])) {
                throw new DomainException('مباراة غير صالحة في القرعة');
            }

            if (! $homeId || ! $awayId) {
                throw new DomainException('يجب تعيين الفريقين معاً في كل مباراة');
            }

            if ($homeId === $awayId) {
                throw new DomainException('لا يمكن لفريق أن يواجه نفسه في المباراة');
            }

            if (in_array($homeId, $assignedTeamIds, true) || in_array($awayId, $assignedTeamIds, true)) {
                throw new DomainException('تم تعيين أحد الفرق في أكثر من خانة واحدة');
            }

            if (! $qualifiedMap->has($homeId) || ! $qualifiedMap->has($awayId)) {
                throw new DomainException('أحد الفرق المعينة غير مؤهل لهذا الدور');
            }

            if ($preventSameGroup) {
                $homeGroup = $qualifiedMap[$homeId]['group_id'] ?? null;
                $awayGroup = $qualifiedMap[$awayId]['group_id'] ?? null;
                if ($homeGroup && $awayGroup && $homeGroup === $awayGroup) {
                    throw new DomainException("الفريقان ({$qualifiedMap[$homeId]['name']}) و ({$qualifiedMap[$awayId]['name']}) من نفس المجموعة — تنص اللائحة (القاعدة 1) على منع التقائهما في ربع النهائي");
                }
            }

            // Rule 2: First-place team must face a second-place team from another group
            $homeRank = $qualifiedMap[$homeId]['rank'] ?? null;
            $awayRank = $qualifiedMap[$awayId]['rank'] ?? null;
            if ($homeRank && $awayRank && $homeRank === $awayRank) {
                $rankLabel = $homeRank === 1 ? 'متصدرين لمجموعتيهما' : 'وصيفين لمجموعتيهما';
                throw new DomainException("المباراة لا يمكن أن تجمع بين فريقين {$rankLabel} — تنص اللائحة (القاعدة 2) على أن يواجه متصدر المجموعة وصيف مجموعة أخرى في ربع النهائي");
            }

            $assignedTeamIds[] = $homeId;
            $assignedTeamIds[] = $awayId;
        }

        $expectedCount = $fixtures->count() * 2;
        if (count($assignedTeamIds) !== $expectedCount) {
            throw new DomainException("يجب تعيين جميع الفرق المؤهلة ($expectedCount فريقاً) في خانات الدور الأول");
        }

        DB::transaction(function () use ($tournament, $assignments, $fixtures, $preventSameGroup, $request) {
            foreach ($assignments as $a) {
                $f = $fixtures[$a['fixture_id']];
                $f->forceFill([
                    'home_team_id' => $a['home_team_id'],
                    'away_team_id' => $a['away_team_id'],
                ])->save();

                $this->bracket->ensureMatch($tournament, $f);
            }

            $plan = $tournament->plan ?? [];
            $knockout = $plan['knockout'] ?? [];
            $versions = $knockout['draw_versions'] ?? [];
            $nextVersion = count($versions) + 1;

            $versions[] = [
                'version' => $nextVersion,
                'confirmed_at' => now()->toISOString(),
                'confirmed_by' => $request->user()?->id,
                'confirmed_by_name' => $request->user()?->name ?? 'مسؤول اللجنة',
                'assignments_count' => count($assignments),
                'assignments' => $assignments,
                'reason' => $request->input('reason', 'اعتماد قرعة الدور الأول'),
            ];

            $knockout['draw_status'] = 'confirmed';
            $knockout['draw_confirmed_at'] = now()->toISOString();
            $knockout['draw_confirmed_by'] = $request->user()?->id;
            $knockout['current_version'] = $nextVersion;
            $knockout['draw_versions'] = $versions;
            $knockout['rules'] = [
                'prevent_same_group_r1' => $preventSameGroup,
            ];

            $plan['knockout'] = $knockout;
            $tournament->forceFill(['plan' => $plan])->save();
        });

        return response()->json([
            'data' => $this->bracket->bracket($tournament),
            'message' => 'تم اعتماد قرعة الدور الإقصائي بنجاح',
        ]);
    }

    public function updateKnockoutRules(Request $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $plan = $tournament->plan ?? [];
        $knockout = $plan['knockout'] ?? [];

        if ($request->has('rules')) {
            $knockout['rules'] = array_merge($knockout['rules'] ?? [], $request->input('rules', []));
        }

        if ($request->has('round_rules')) {
            $knockout['round_rules'] = $request->input('round_rules', []);
        }

        $plan['knockout'] = $knockout;
        $tournament->forceFill(['plan' => $plan])->save();

        return response()->json([
            'data' => $knockout,
            'message' => 'تم حفظ قواعد الأدوار الإقصائية بنجاح',
        ]);
    }

    public function drawVersions(Tournament $tournament): JsonResponse
    {
        $this->authorize('view', $tournament);

        $plan = $tournament->plan ?? [];
        $knockout = $plan['knockout'] ?? [];

        return response()->json([
            'data' => [
                'current_version' => $knockout['current_version'] ?? null,
                'draw_status' => $knockout['draw_status'] ?? 'pending',
                'versions' => $knockout['draw_versions'] ?? [],
            ],
        ]);
    }

    public function drawRollback(Request $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if (in_array($tournament->status, [Tournament::STATUS_COMPLETED, Tournament::STATUS_CANCELLED], true)) {
            throw new DomainException('لا يمكن التراجع عن القرعة لبطولة مكتملة أو ملغاة', 422);
        }

        $knockoutRoundIds = Round::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where('stage', '!=', RoundStage::Group)
            ->pluck('id');

        $playedMatches = FootballMatch::query()
            ->whereIn('round_id', $knockoutRoundIds)
            ->whereIn('status', [MatchStatus::Finished->value, ...MatchStatus::live()])
            ->get(['id', 'home_team_id', 'away_team_id', 'home_score', 'away_score', 'status']);

        if ($playedMatches->isNotEmpty()) {
            throw new DomainException('لا يمكن التراجع عن القرعة المعتمدة لوجود مباريات بدأت أو انتهت بالفعل في الأدوار الإقصائية', 422);
        }

        $reason = trim((string) $request->input('reason', ''));
        if (empty($reason)) {
            throw new DomainException('يرجى تقديم سبب صريح وموثق لطلب التراجع عن القرعة المعتمدة', 422);
        }

        $firstRoundId = $this->bracket->firstKnockoutRoundId($tournament);
        if ($firstRoundId) {
            Fixture::query()
                ->where('round_id', $firstRoundId)
                ->update([
                    'home_team_id' => null,
                    'away_team_id' => null,
                ]);
        }

        $plan = $tournament->plan ?? [];
        $knockout = $plan['knockout'] ?? [];
        $versions = $knockout['draw_versions'] ?? [];

        $versions[] = [
            'action' => 'rollback',
            'rolled_back_at' => now()->toISOString(),
            'rolled_back_by' => $request->user()?->id,
            'rolled_back_by_name' => $request->user()?->name ?? 'مسؤول اللجنة',
            'reason' => $reason,
        ];

        $knockout['draw_status'] = 'pending';
        $knockout['draw_confirmed_at'] = null;
        $knockout['draw_confirmed_by'] = null;
        $knockout['draw_versions'] = $versions;
        $plan['knockout'] = $knockout;
        $tournament->forceFill(['plan' => $plan])->save();

        return response()->json([
            'data' => $this->bracket->bracket($tournament),
            'message' => 'تم إلغاء اعتماد القرعة وإعادتها لحالة المسودة للتمكن من إعادة التسكين بأمان',
        ]);
    }

    public function disciplinary(Tournament $tournament): JsonResponse
    {
        $this->authorize('view', $tournament);

        return response()->json([
            'data' => $this->suspensions->tournamentDisciplinarySummary($tournament),
        ]);
    }

    public function issueTournamentLongSuspension(Request $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $validated = $request->validate([
            'player_id' => 'required|integer',
            'reason' => 'required|string|max:500',
        ]);

        $result = $this->suspensions->issueTournamentLongSuspension(
            $tournament,
            (int) $validated['player_id'],
            $validated['reason'],
            $request->user()->id
        );

        return response()->json([
            'data' => $result,
            'message' => 'تم إصدار قرار الإيقاف لكامل البطولة وتطبيقه رسمياً',
        ]);
    }

    public function liftTournamentLongSuspension(Request $request, Tournament $tournament, int $playerId): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $reason = (string) $request->input('reason', 'إلغاء بقرار اللجنة المنظمة');

        $result = $this->suspensions->liftTournamentLongSuspension(
            $tournament,
            $playerId,
            $reason,
            $request->user()->id
        );

        return response()->json([
            'data' => $result,
            'message' => 'تم رفع الإيقاف عن اللاعب رسمياً',
        ]);
    }

    public function liftPlayerSuspension(Request $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $validated = $request->validate([
            'player_id' => 'required|integer',
            'reason' => 'nullable|string|max:500',
        ]);

        $reason = $validated['reason'] ?? 'رفع الإيقاف بقرار من اللجنة المنظمة';

        $result = $this->suspensions->liftPlayerSuspension(
            $tournament,
            (int) $validated['player_id'],
            $reason,
            $request->user()->id
        );

        return response()->json([
            'data' => $result,
            'message' => 'تم رفع الإيقاف عن اللاعب وأصبح متاحاً للمشاركة رسمياً',
        ]);
    }

    public function reinstateSuspension(Request $request, Tournament $tournament, int $playerId): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $result = $this->suspensions->reinstatePlayerSuspension(
            $tournament,
            $playerId,
            $request->user()->id
        );

        return response()->json([
            'data' => $result,
            'message' => 'تم إلغاء العفو وإعادة تطبيق الإيقاف وفق القواعد',
        ]);
    }

    public function resetYellowCards(Request $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $validated = $request->validate([
            'scope' => 'nullable|string|in:group,all',
        ]);

        $scope = $validated['scope'] ?? 'group';

        $result = $this->suspensions->resetYellowCards(
            $tournament,
            $scope,
            $request->user()->id
        );

        return response()->json([
            'data' => $result,
            'message' => $scope === 'all'
                ? 'تم تصفير جميع الإنذارات المتراكمة لجميع الفرق بنجاح'
                : 'تم تصفير إنذارات دور المجموعات بنجاح (القاعدة C)',
        ]);
    }
}
