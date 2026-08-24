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
        $teamId = $user->team?->id;

        if (! $teamId) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $matchRequest = MatchRequest::findOrFail($matchRequestId);

        if ($matchRequest->host_team_id !== $teamId && $matchRequest->opponent_team_id !== $teamId) {
            return response()->json(['message' => 'غير مصرح لك برؤية تشكيلة هذه المباراة'], 403);
        }

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
                ];
            }

            $playerData = [
                'id' => $entry->player_id,
                'name' => $entry->player?->name ?? $entry->player?->user?->name,
                'position' => $entry->position ?? $entry->player?->position,
                'shirt_number' => $entry->shirt_number ?? $entry->player?->number,
                'is_captain' => $entry->is_captain,
                'is_vice_captain' => $entry->is_vice_captain,
                'is_free_kick_taker' => $entry->is_free_kick_taker,
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
        $teamId = $user->team?->id;

        if (! $teamId) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $matchRequest = MatchRequest::where('id', $matchRequestId)
            ->whereIn('status', ['open', 'accepted'])
            ->firstOrFail();

        if ($matchRequest->host_team_id !== $teamId && $matchRequest->opponent_team_id !== $teamId) {
            return response()->json(['message' => 'غير مصرح لك بتعديل تشكيلة هذه المباراة'], 403);
        }

        $validated = $request->validate([
            'players' => 'required|array|min:1',
            'players.*.player_id' => 'required|integer|exists:players,id',
            'players.*.position' => 'nullable|string|max:30',
            'players.*.shirt_number' => 'nullable|integer|min:1|max:99',
            'players.*.is_starter' => 'sometimes|boolean',
            'players.*.is_captain' => 'sometimes|boolean',
            'players.*.is_vice_captain' => 'sometimes|boolean',
            'players.*.is_free_kick_taker' => 'sometimes|boolean',
            'players.*.order_index' => 'sometimes|integer|min:0',
        ]);

        foreach ($validated['players'] as $entry) {
            $player = Player::where('id', $entry['player_id'])->where('team_id', $teamId)->first();
            if (! $player) {
                return response()->json(['message' => "اللاعب {$entry['player_id']} ليس من أعضاء فريقك"], 422);
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

    public function roster(Request $request, int $matchRequestId): JsonResponse
    {
        $user = $request->user();
        $teamId = $user->team?->id;

        if (! $teamId) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $matchRequest = MatchRequest::findOrFail($matchRequestId);

        if ($matchRequest->host_team_id !== $teamId && $matchRequest->opponent_team_id !== $teamId) {
            return response()->json(['message' => 'غير مصرح لك'], 403);
        }

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
        $teamId = $user->team?->id;

        if (! $teamId) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $matchRequest = MatchRequest::where('id', $matchRequestId)
            ->whereIn('status', ['open', 'accepted'])
            ->firstOrFail();

        if ($matchRequest->host_team_id !== $teamId && $matchRequest->opponent_team_id !== $teamId) {
            return response()->json(['message' => 'غير مصرح لك'], 403);
        }

        $validated = $request->validate([
            'player_id' => 'required|integer|exists:players,id',
        ]);

        $player = Player::where('id', $validated['player_id'])->where('team_id', $teamId)->first();
        if (! $player) {
            return response()->json(['message' => 'اللاعب ليس من أعضاء فريقك'], 422);
        }

        $labels = [
            'captain' => 'القائد',
            'vice_captain' => 'نائب القائد',
            'free_kick_taker' => 'لاعب الركلات الحرة',
        ];

        match ($role) {
            'captain' => $this->lineupService->setCaptainForMatchRequest($matchRequest, $teamId, $validated['player_id']),
            'vice_captain' => $this->lineupService->setViceCaptainForMatchRequest($matchRequest, $teamId, $validated['player_id']),
            'free_kick_taker' => $this->lineupService->setFreeKickTakerForMatchRequest($matchRequest, $teamId, $validated['player_id']),
        };

        return response()->json([
            'message' => 'تم تعيين '.($labels[$role] ?? $role).' بنجاح',
        ]);
    }
}
