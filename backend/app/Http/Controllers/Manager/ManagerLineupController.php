<?php

namespace App\Http\Controllers\Manager;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Match\Services\LineupService;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Controller;
use App\Domains\Team\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagerLineupController extends Controller
{
    public function __construct(
        private LineupService $lineupService,
    ) {}

    public function index(Request $request, int $matchRequestId): JsonResponse
    {
        $user = $request->user();
        $matchRequest = MatchRequest::findOrFail($matchRequestId);
        $team = $this->resolveTeamForMatch($user, $matchRequest);
        $teamId = $team->id;

        $lineups = $this->lineupService->forMatchRequest($matchRequestId);

        $grouped = [];
        foreach ($lineups as $entry) {
            $tid = $entry->team_id;
            if (! isset($grouped[$tid])) {
                $grouped[$tid] = [
                    'team_id' => $tid,
                    'team_name' => $entry->team?->name,
                    'starters' => [],
                    'bench' => [],
                    'captain_id' => null,
                    'vice_captain_id' => null,
                    'free_kick_taker_id' => null,
                    'penalty_taker_id' => null,
                    'corner_taker_id' => null,
                    'formation' => $this->lineupService->formationForMatchRequest($matchRequestId, $tid),
                ];
            }

            $playerData = [
                'id' => $entry->player_id,
                'name' => $entry->player?->name ?? $entry->player?->user?->name,
                'position' => $entry->position ?? $entry->player?->position,
                'tactical_position' => $entry->tactical_position,
                'role' => $entry->role,
                'x' => $entry->x,
                'y' => $entry->y,
                'shirt_number' => $entry->shirt_number ?? $entry->player?->number,
                'is_captain' => $entry->is_captain,
                'is_vice_captain' => $entry->is_vice_captain,
                'is_free_kick_taker' => $entry->is_free_kick_taker,
                'is_penalty_taker' => $entry->is_penalty_taker,
                'is_corner_taker' => $entry->is_corner_taker,
                'order_index' => $entry->order_index,
            ];

            if ($entry->is_starter) {
                $grouped[$tid]['starters'][] = $playerData;
            } else {
                $grouped[$tid]['bench'][] = $playerData;
            }

            if ($entry->is_captain) {
                $grouped[$tid]['captain_id'] = $entry->player_id;
            }
            if ($entry->is_vice_captain) {
                $grouped[$tid]['vice_captain_id'] = $entry->player_id;
            }
            if ($entry->is_free_kick_taker) {
                $grouped[$tid]['free_kick_taker_id'] = $entry->player_id;
            }
            if ($entry->is_penalty_taker) {
                $grouped[$tid]['penalty_taker_id'] = $entry->player_id;
            }
            if ($entry->is_corner_taker) {
                $grouped[$tid]['corner_taker_id'] = $entry->player_id;
            }
        }

        return response()->json([
            'match_request' => [
                'id' => $matchRequest->id,
                'player_format' => $matchRequest->player_format,
                'status' => $matchRequest->status,
                'host_team_id' => $matchRequest->host_team_id,
                'opponent_team_id' => $matchRequest->opponent_team_id,
            ],
            'lineups' => array_values($grouped),
            'required_starters' => LineupService::startersRequired($matchRequest->player_format),
        ]);
    }

    public function update(Request $request, int $matchRequestId): JsonResponse
    {
        $user = $request->user();

        $matchRequest = MatchRequest::where('id', $matchRequestId)
            ->whereIn('status', ['open', 'accepted'])
            ->firstOrFail();

        $team = $this->resolveTeamForMatch($user, $matchRequest);
        $teamId = $team->id;

        $validated = $request->validate([
            'players' => 'required|array|min:1',
            'players.*.player_id' => 'required|integer|exists:players,id',
            'players.*.position' => 'nullable|string|max:30',
            'players.*.tactical_position' => 'nullable|string|max:10',
            'players.*.role' => 'nullable|string|max:20',
            'players.*.x' => 'nullable|numeric|min:0|max:1',
            'players.*.y' => 'nullable|numeric|min:0|max:1',
            'players.*.shirt_number' => 'nullable|integer|min:1|max:99',
            'players.*.is_starter' => 'sometimes|boolean',
            'players.*.is_captain' => 'sometimes|boolean',
            'players.*.is_vice_captain' => 'sometimes|boolean',
            'players.*.is_free_kick_taker' => 'sometimes|boolean',
            'players.*.is_penalty_taker' => 'sometimes|boolean',
            'players.*.is_corner_taker' => 'sometimes|boolean',
            'players.*.order_index' => 'sometimes|integer|min:0',
            'formation' => 'sometimes|array',
            'formation.format' => 'sometimes|nullable|string|max:10',
            'formation.preset_key' => 'sometimes|nullable|string|max:50',
            'formation.formation' => 'sometimes|nullable|string|max:255',
        ]);

        foreach ($validated['players'] as $entry) {
            $player = Player::where('id', $entry['player_id'])->where('team_id', $teamId)->first();
            if (! $player) {
                return response()->json(['message' => "اللاعب {$entry['player_id']} ليس من أعضاء فريقك"], 422);
            }

            if (! ($entry['is_starter'] ?? false)) {
                continue;
            }

            foreach (['tactical_position', 'x', 'y'] as $field) {
                if (! isset($entry[$field]) || $entry[$field] === null || $entry[$field] === '') {
                    return response()->json([
                        "errors" => ["players.{$field}" => 'اللاعبون الأساسيون يحتاجون مركزاً تكتيكياً وإحداثيات صالحة'],
                    ], 422);
                }
            }
        }

        $startersCount = count(array_filter($validated['players'], fn ($p) => $p['is_starter'] ?? false));
        $required = LineupService::startersRequired($matchRequest->player_format);

        if ($startersCount > $required) {
            return response()->json([
                'message' => "لا يمكن تعيين أكثر من {$required} لاعبين أساسيين لصيغة {$matchRequest->player_format}",
            ], 422);
        }

        $this->lineupService->upsertForMatchRequest($matchRequest, $teamId, $validated['players']);

        if (! empty($validated['formation'])) {
            $this->lineupService->upsertFormationForMatchRequest($matchRequest, $teamId, $validated['formation']);
        }

        $lineups = $this->lineupService->forMatchRequest($matchRequestId);

        return response()->json([
            'message' => 'تم حفظ التشكيلة بنجاح',
            'lineups' => $lineups,
        ]);
    }

    public function setCaptain(Request $request, int $matchRequestId): JsonResponse
    {
        return $this->setRoleForMatchRequest($request, $matchRequestId, 'captain');
    }

    public function setViceCaptain(Request $request, int $matchRequestId): JsonResponse
    {
        return $this->setRoleForMatchRequest($request, $matchRequestId, 'vice_captain');
    }

    public function setFreeKickTaker(Request $request, int $matchRequestId): JsonResponse
    {
        return $this->setRoleForMatchRequest($request, $matchRequestId, 'free_kick_taker');
    }

    public function setPenaltyTaker(Request $request, int $matchRequestId): JsonResponse
    {
        return $this->setRoleForMatchRequest($request, $matchRequestId, 'penalty_taker');
    }

    public function setCornerTaker(Request $request, int $matchRequestId): JsonResponse
    {
        return $this->setRoleForMatchRequest($request, $matchRequestId, 'corner_taker');
    }

    public function roster(Request $request, int $matchRequestId): JsonResponse
    {
        $user = $request->user();
        $matchRequest = MatchRequest::findOrFail($matchRequestId);
        $team = $this->resolveTeamForMatch($user, $matchRequest);
        $teamId = $team->id;

        $players = Player::where('team_id', $teamId)
            ->active()
            ->orderBy('is_essential', 'desc')
            ->orderBy('number')
            ->orderBy('name')
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'position' => $p->position,
                'number' => $p->number,
                'is_essential' => $p->is_essential,
            ]);

        $lineupPlayerIds = MatchRequest::find($matchRequestId)
            ->lineups()
            ->where('team_id', $teamId)
            ->pluck('player_id')
            ->toArray();

        return response()->json([
            'roster' => $players,
            'lineup_player_ids' => $lineupPlayerIds,
        ]);
    }

    private function setRoleForMatchRequest(Request $request, int $matchRequestId, string $role): JsonResponse
    {
        $user = $request->user();
        $matchRequest = MatchRequest::where('id', $matchRequestId)
            ->whereIn('status', ['open', 'accepted'])
            ->firstOrFail();

        $team = $this->resolveTeamForMatch($user, $matchRequest);
        $teamId = $team->id;

        $validated = $request->validate([
            'player_id' => 'required|integer|exists:players,id',
        ]);

        $player = Player::where('id', $validated['player_id'])->where('team_id', $teamId)->first();
        if (! $player) {
            return response()->json(['message' => 'اللاعب ليس من أعضاء فريقك'], 422);
        }

        $entry = MatchRequest::find($matchRequestId)->lineups()
            ->where('team_id', $teamId)
            ->where('player_id', $player->id)
            ->first();

        if (! $entry || ! $entry->is_starter) {
            return response()->json(['message' => 'يجب أن يكون اللاعب أساسياً لتعيينه بهذا الدور'], 422);
        }

        $labels = [
            'captain' => 'القائد',
            'vice_captain' => 'نائب القائد',
            'free_kick_taker' => 'لاعب الركلات الحرة',
            'penalty_taker' => 'لاعب ركلات الجزاء',
            'corner_taker' => 'لاعب الركنيات',
        ];

        match ($role) {
            'captain' => $this->lineupService->setCaptainForMatchRequest($matchRequest, $teamId, $validated['player_id']),
            'vice_captain' => $this->lineupService->setViceCaptainForMatchRequest($matchRequest, $teamId, $validated['player_id']),
            'free_kick_taker' => $this->lineupService->setFreeKickTakerForMatchRequest($matchRequest, $teamId, $validated['player_id']),
            'penalty_taker' => $this->lineupService->setPenaltyTakerForMatchRequest($matchRequest, $teamId, $validated['player_id']),
            'corner_taker' => $this->lineupService->setCornerTakerForMatchRequest($matchRequest, $teamId, $validated['player_id']),
        };

        return response()->json([
            'message' => 'تم تعيين '.($labels[$role] ?? $role).' بنجاح',
        ]);
    }

    private function resolveTeamForMatch($user, MatchRequest $matchRequest): Team
    {
        $managedTeamIds = $user->managedTeams()->pluck('id')->all();

        if (in_array($matchRequest->host_team_id, $managedTeamIds, true)) {
            return Team::findOrFail($matchRequest->host_team_id);
        }

        if ($matchRequest->opponent_team_id && in_array($matchRequest->opponent_team_id, $managedTeamIds, true)) {
            return Team::findOrFail($matchRequest->opponent_team_id);
        }

        abort(403, 'غير مصرح لك بإدارة تشكيلة هذه المباراة');
    }
}

