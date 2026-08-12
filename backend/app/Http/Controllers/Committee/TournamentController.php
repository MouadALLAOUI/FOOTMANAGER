<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Resources\TournamentDetailResource;
use App\Domains\Tournament\Resources\TournamentResource;
use App\Domains\Tournament\Services\TournamentSetupService;
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
    ) {}

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');

        $query = Tournament::query()
            ->with('organizer')
            ->where('organizer_id', $request->user()->id)
            ->latest();

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
        $data = $request->validated();

        if (in_array($data['tournament_format'], ['groups_knockout', 'groups_only'], true)
            && ($data['group_mode'] ?? 'fixed') !== 'free') {
            [$data['groups_count'], $data['teams_per_group']] = $this->deriveGroupSplit($data);
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
                'tournament_format' => $data['tournament_format'],
                'teams_count' => $data['teams_count'],
                'groups_count' => $data['groups_count'],
                'teams_per_group' => $data['teams_per_group'],
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
     * Derive a balanced group split when teams-per-group or groups-count are omitted.
     *
     * @param  array<string, mixed>  $data
     * @return array{0: int, 1: int}
     */
    private function deriveGroupSplit(array $data): array
    {
        if (isset($data['groups_count']) && isset($data['teams_per_group'])) {
            return [(int) $data['groups_count'], (int) $data['teams_per_group']];
        }

        if (isset($data['groups_count'])) {
            return [
                (int) $data['groups_count'],
                max(2, (int) ceil((int) $data['teams_count'] / (int) $data['groups_count'])),
            ];
        }

        if (isset($data['teams_per_group'])) {
            return [
                min(max((int) ceil((int) $data['teams_count'] / (int) $data['teams_per_group']), 2), 16),
                (int) $data['teams_per_group'],
            ];
        }

        return TournamentSetupService::deriveGroups((int) $data['teams_count']);
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

        if ($tournament->status !== 'draft') {
            throw new DomainException('لا يمكن تعديل البطولة بعد انطلاقها');
        }

        $tournament->update($request->validated());

        return response()->json(['data' => new TournamentDetailResource($tournament->load('organizer'))]);
    }

    public function destroy(Tournament $tournament): Response
    {
        $this->authorize('manage', $tournament);

        if ($tournament->status !== 'draft') {
            throw new DomainException('لا يمكن حذف بطولة بعد انطلاقها');
        }

        $this->setup->teardown($tournament);

        return response()->noContent();
    }

    public function publish(Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        if ($tournament->status !== 'draft') {
            throw new DomainException('البطولة منشورة بالفعل');
        }

        $tournament->forceFill([
            'status' => 'published',
            'published_at' => now(),
        ])->save();

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
