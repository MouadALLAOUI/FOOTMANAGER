<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Competition\Models\Round;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Services\TournamentBracketService;
use App\Domains\Tournament\Services\TournamentFixtureService;
use App\Domains\Tournament\Services\TournamentStandingsService;
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
        $knockoutTeams = (int) $this->bracket->resolvedKnockoutTeams($tournament);

        if (in_array($tournament->tournament_format, ['groups_knockout', 'groups_double_round_robin_knockout'], true)) {
            $standings = $this->standings->standings($tournament);
            $groups = $standings['groups'];

            if ($groups === []) {
                throw new DomainException('لا توجد مجموعات جاهزة لاستخراج المتأهلين');
            }

            $perGroup = intdiv($knockoutTeams, count($groups));

            if ($perGroup < 1) {
                throw new DomainException('عدد الفرق المتأهلة أقل من عدد المجموعات');
            }

            $qualified = [];

            foreach ($groups as $group) {
                foreach (array_slice($group['rows'], 0, $perGroup) as $row) {
                    $qualified[] = (int) $row['team_id'];
                }
            }

            if (count($qualified) !== $knockoutTeams) {
                throw new DomainException('عدد الفرق المتأهلة لا يطابق الحجم المتوقع للدور الإقصائي');
            }

            return $qualified;
        }

        $teams = $this->bracket->knockoutTeamIds($tournament);

        if (count($teams) !== $knockoutTeams) {
            throw new DomainException('عدد الفرق المسجلة لا يطابق الحجم المتوقع للدور الإقصائي');
        }

        return $teams;
    }

    public function drawTeams(Tournament $tournament): JsonResponse
    {
        $this->authorize('view', $tournament);

        $detailed = $this->fixtures->qualifiedTeamsDetailed($tournament);
        $firstRoundId = $this->bracket->firstKnockoutRoundId($tournament);

        $firstRound = null;
        $fixtures = collect();

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

        return response()->json([
            'data' => [
                'qualified_teams' => $detailed['teams'] ?? [],
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

    public function confirmDraw(Request $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if (in_array($tournament->status, [Tournament::STATUS_COMPLETED, Tournament::STATUS_CANCELLED], true)) {
            throw new DomainException('لا يمكن تعديل القرعة لبطولة مكتملة أو ملغاة');
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
                    throw new DomainException("الفريقان ({$qualifiedMap[$homeId]['name']}) و ({$qualifiedMap[$awayId]['name']}) من نفس المجموعة — يمنع القانون التقائهما في الدور الأول");
                }
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
            $plan['knockout'] = array_merge($plan['knockout'] ?? [], [
                'draw_status' => 'confirmed',
                'draw_confirmed_at' => now()->toISOString(),
                'draw_confirmed_by' => $request->user()?->id,
                'rules' => [
                    'prevent_same_group_r1' => $preventSameGroup,
                ],
            ]);

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
}
