<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Subscription\Services\SubscriptionService;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Resources\TournamentDetailResource;
use App\Domains\Tournament\Resources\TournamentResource;
use App\Domains\Tournament\Services\TournamentSetupService;
use App\Domains\Tournament\Services\TournamentTerrainBookingService;
use App\Domains\Tournament\Services\TerrainReservationService;
use App\Http\Requests\Committee\StoreTournamentRequest;
use App\Http\Requests\Committee\UpdateTournamentRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class TournamentController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly TournamentSetupService $setup,
        private readonly SubscriptionService $subscription,
        private readonly TournamentTerrainBookingService $bookings,
        private readonly TerrainReservationService $reservations,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $visibility = $request->query('visibility', 'visible');

        $query = Tournament::query()
            ->with('organizer')
            ->where('organizer_id', $request->user()->id)
            ->latest();

        if ($visibility === 'hidden') {
            $query->hidden();
        } else {
            $query->visible();
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $perPage = min(max((int) $request->query('per_page', 20), 1), 50);
        $tournaments = $query->paginate($perPage);

        return response()->json([
            'data' => TournamentResource::collection($tournaments),
            'meta' => [
                'current_page' => $tournaments->currentPage(),
                'per_page' => $tournaments->perPage(),
                'total' => $tournaments->total(),
                'last_page' => $tournaments->lastPage(),
            ],
        ]);
    }

    public function store(StoreTournamentRequest $request): JsonResponse
    {
        $this->subscription->authorizeResource(
            $request->user(),
            'tournament_limit',
            $this->subscription->currentUsage($request->user(), 'tournament_limit'),
        );

        $data = $request->validated();

        if (in_array($data['tournament_format'], ['groups_knockout', 'groups_only'], true)) {
            $data['teams_per_group'] = (int) ($data['teams_per_group'] ?? 4);
            $data['groups_count'] = $this->deriveGroupsCount($data);
        } else {
            $teamsCount = (int) $data['teams_count'];
            $data['teams_per_group'] = $teamsCount;
            $data['groups_count'] = 1;
        }

        $tournament = DB::transaction(function () use ($data, $request) {
            $tournament = Tournament::query()->create([
                'organizer_id' => $request->user()->id,
                'name' => $data['name'],
                'edition' => $data['edition'] ?? null,
                'category' => $data['category'] ?? null,
                'description' => $data['description'] ?? null,
                'location' => $data['location'] ?? null,
                'stadium_id' => $data['stadium_id'] ?? null,
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'] ?? null,
                'registration_start_at' => $data['registration_start_at'] ?? null,
                'registration_end_at' => $data['registration_end_at'] ?? null,
                'registration_fee' => $data['registration_fee'] ?? 0,
                'tournament_format' => $data['tournament_format'],
                'teams_count' => $data['teams_count'],
                'groups_count' => $data['groups_count'],
                'teams_per_group' => $data['teams_per_group'],
                'max_players_per_team' => $data['max_players_per_team'] ?? null,
                'group_mode' => $data['group_mode'] ?? 'fixed',
                'match_duration_minutes' => $data['match_duration_minutes'] ?? 90,
                'matches_per_day' => $data['matches_per_day'] ?? null,
                'knockout_teams' => $data['knockout_teams'] ?? null,
                'qualify_per_group' => $data['qualify_per_group'] ?? null,
                'points_for_win' => $data['points_for_win'],
                'points_for_draw' => $data['points_for_draw'],
                'points_for_loss' => $data['points_for_loss'],
                'status' => 'draft',
            ]);

            $this->setup->buildStructure($tournament);

            return $tournament->load('organizer');
        });

        return response()->json(['data' => new TournamentDetailResource($tournament)], 201);
    }

    /**
     * Derive the group count from teams and teams-per-group. An explicit
     * groups_count always wins; otherwise groups = ceil(teams / per_group),
     * clamped to at least 2 groups.
     *
     * @param  array<string, mixed>  $data
     */
    private function deriveGroupsCount(array $data): int
    {
        if (isset($data['groups_count']) && (int) $data['groups_count'] >= 1) {
            return (int) $data['groups_count'];
        }

        $teams = (int) $data['teams_count'];
        $perGroup = max(2, (int) ($data['teams_per_group'] ?? 4));

        return min(max((int) ceil($teams / $perGroup), 2), 16);
    }

    public function show(Tournament $tournament): JsonResponse
    {
        $this->authorize('view', $tournament);

        $tournament->load(['organizer', 'stadium'])->loadCount('tournamentTeams');

        return response()->json(['data' => new TournamentDetailResource($tournament)]);
    }

    public function update(UpdateTournamentRequest $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if ($tournament->isCompleted() || $tournament->isCancelled() || $tournament->hasSettledResult()) {
            throw new DomainException('لا يمكن تعديل البطولة بعد تسجيل أول نتيجة');
        }

        $data = $request->validated();

        $structural = [
            'teams_count',
            'groups_count',
            'teams_per_group',
            'group_mode',
            'tournament_format',
            'knockout_teams',
            'qualify_per_group',
        ];

        $changedStructural = array_intersect(array_keys($data), $structural);

        if ($changedStructural) {
            if (isset($data['teams_count']) && $tournament->registeredTeamsCount() > (int) $data['teams_count']) {
                throw new DomainException('لا يمكن تقليص عدد الفرق إلى أقل من الفرق المسجلة');
            }

            $format = $data['tournament_format'] ?? $tournament->tournament_format;

            if (in_array($format, ['groups_knockout', 'groups_only'], true)) {
                $data['teams_per_group'] = (int) ($data['teams_per_group'] ?? $tournament->teams_per_group ?? 4);
                $data['groups_count'] = $this->deriveGroupsCount($data + ['teams_count' => $data['teams_count'] ?? $tournament->teams_count]);

                $this->assertGroupLayoutFits($tournament, $data);
            } else {
                $data['groups_count'] = 1;
                $data['teams_per_group'] = (int) ($data['teams_count'] ?? $tournament->teams_count);
            }
        }

        if (array_key_exists('max_players_per_team', $data)) {
            $newMax = $data['max_players_per_team'] !== null ? (int) $data['max_players_per_team'] : null;

            if ($newMax !== null) {
                $largestSquad = DB::table('tournament_squad_members')
                    ->where('tournament_id', $tournament->id)
                    ->selectRaw('team_id, COUNT(*) as cnt')
                    ->groupBy('team_id')
                    ->orderByDesc('cnt')
                    ->value('cnt');

                if ($largestSquad && (int) $largestSquad > $newMax) {
                    throw new DomainException("لا يمكن تقليص الحد الأقصى إلى أقل من عدد اللاعبين المسجلين حالياً (أكبر قائمة تضم {$largestSquad} لاعباً)");
                }
            }
        }

        $tournament->update($data);

        return response()->json(['data' => new TournamentDetailResource($tournament->load('organizer'))]);
    }

    /**
     * Change the terrain reservation mode independently of the structural
     * settings. Unlike the general update, this is allowed at any point in a
     * tournament's life (even after fixtures are generated or it has started),
     * so the committee can always flip between auto and the confirmed flow.
     */
    public function setReservationMode(Request $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $mode = $request->input('terrain_reservation_mode');

        if (! in_array($mode, Tournament::TERRAIN_RESERVATION_MODES, true)) {
            throw new DomainException('نظام حجز الملعب غير صالح');
        }

        $released = $this->reservations->setMode($tournament, $mode);

        return response()->json([
            'data' => new TournamentDetailResource($tournament->load('organizer')),
            'released_reservations' => $released,
        ]);
    }

    /**
     * Before fixtures exist, structural changes must not break the current
     * draw: no group may already hold more teams than the new teams-per-group
     * and the tournament may not have more non-empty groups than the new count.
     *
     * @param  array<string, mixed>  $data
     */
    private function assertGroupLayoutFits(Tournament $tournament, array $data): void
    {
        $groupMode = $data['group_mode'] ?? $tournament->group_mode;

        if ($groupMode === 'free') {
            return;
        }

        $newPerGroup = (int) $data['teams_per_group'];
        $newGroupsCount = (int) $data['groups_count'];

        $sizes = DB::table('tournament_teams')
            ->where('tournament_id', $tournament->id)
            ->whereNotNull('group_id')
            ->selectRaw('group_id, COUNT(*) as cnt')
            ->groupBy('group_id')
            ->get();

        foreach ($sizes as $row) {
            if ((int) $row->cnt > $newPerGroup) {
                throw new DomainException("لا يمكن تصغير حجم المجموعة إلى أقل من {$row->cnt} فرق (المجموعة الحالية)");
            }
        }

        if ($sizes->count() > $newGroupsCount) {
            throw new DomainException('لا يمكن تقليص عدد المجموعات إلى أقل من عدد المجموعات المستخدمة حالياً');
        }
    }

    public function destroy(Tournament $tournament): Response
    {
        $this->authorize('manage', $tournament);

        $this->setup->teardown($tournament);

        return response()->noContent();
    }

    public function hide(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $tournament->forceFill(['hidden_at' => now()])->save();

        return response()->json(['data' => new TournamentDetailResource($tournament->load('organizer'))]);
    }

    public function unhide(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $tournament->forceFill(['hidden_at' => null])->save();

        return response()->json(['data' => new TournamentDetailResource($tournament->load('organizer'))]);
    }

    public function openRegistration(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if ($tournament->status !== Tournament::STATUS_DRAFT) {
            throw new DomainException('البطولة منشورة بالفعل');
        }

        $tournament->forceFill([
            'status' => Tournament::STATUS_OPEN_FOR_REGISTRATION,
            'published_at' => now(),
        ])->save();

        return response()->json(['data' => new TournamentDetailResource($tournament->load('organizer'))]);
    }

    public function closeRegistration(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if ($tournament->status !== Tournament::STATUS_OPEN_FOR_REGISTRATION) {
            throw new DomainException('التسجيل غير مفتوح حالياً');
        }

        $tournament->forceFill(['status' => Tournament::STATUS_REGISTRATION_CLOSED])->save();

        return response()->json(['data' => new TournamentDetailResource($tournament->load('organizer'))]);
    }

    public function startTournament(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if ($tournament->status !== Tournament::STATUS_REGISTRATION_CLOSED) {
            throw new DomainException('لا يمكن انطلاق البطولة قبل إغلاق التسجيل');
        }

        $registered = $tournament->registeredTeamsCount();

        if ($registered < $tournament->teams_count) {
            throw new DomainException("لا يمكن انطلاق البطولة إلا باكتمال الفرق (متاح {$registered} من {$tournament->teams_count})");
        }

        $tournament->forceFill(['status' => Tournament::STATUS_IN_PROGRESS])->save();

        return response()->json(['data' => new TournamentDetailResource($tournament->load('organizer'))]);
    }

    public function cancel(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if ($tournament->isCompleted() || $tournament->isCancelled()) {
            throw new DomainException('لا يمكن إلغاء بطولة منتهية');
        }

        $tournament->forceFill(['status' => Tournament::STATUS_CANCELLED])->save();

        $this->bookings->archiveForTournament($tournament);

        return response()->json(['data' => new TournamentDetailResource($tournament->load('organizer'))]);
    }

    public function progress(Tournament $tournament): JsonResponse
    {
        $this->authorize('view', $tournament);

        return response()->json([
            'data' => [
                'tournament_id' => $tournament->id,
                'status' => $tournament->status,
                'stages' => $this->setup->progress($tournament),
            ],
        ]);
    }
}
