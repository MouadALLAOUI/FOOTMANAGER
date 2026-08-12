<?php

namespace App\Domains\Player\Controllers;

use App\Domains\Player\Models\PlayerTransfer;
use App\Domains\Player\Resources\PlayerCareerResource;
use App\Domains\Player\Services\PlayerCareerService;
use App\Domains\Player\Services\PlayerProfileService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CareerController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private PlayerCareerService $service,
        private PlayerProfileService $profiles,
    ) {}

    public function history(Request $request): JsonResponse
    {
        return response()->json([
            'data' => PlayerCareerResource::collection($this->service->history($request->user()->id)),
        ]);
    }

    public function historyForUser(Request $request, int $userId): JsonResponse
    {
        $profile = $this->profiles->findForUser($userId);

        if (! $profile) {
            return response()->json(['message' => 'Profile not found.'], 404);
        }

        $this->authorize('view', $profile);

        return response()->json([
            'data' => PlayerCareerResource::collection($this->service->history($userId)),
        ]);
    }

    public function transfers(Request $request): JsonResponse
    {
        $transfers = $this->service->transfers($request->user()->id)->map(function (PlayerTransfer $transfer) {
            return [
                'id' => $transfer->id,
                'type' => $transfer->type,
                'from_team' => [
                    'id' => $transfer->fromTeam?->id,
                    'name' => $transfer->from_team_name ?? $transfer->fromTeam?->name,
                ],
                'to_team' => [
                    'id' => $transfer->toTeam?->id,
                    'name' => $transfer->to_team_name ?? $transfer->toTeam?->name,
                ],
                'transferred_at' => $transfer->transferred_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'data' => $transfers,
        ]);
    }
}
