<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Shared\Base\Controller;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Resources\TournamentDetailResource;
use App\Domains\Tournament\Services\TournamentBrandingService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TournamentBrandingController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly TournamentBrandingService $service,
    ) {}

    public function update(Request $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $validated = $request->validate($this->service->rules());

        $tournament = $this->service->update($tournament, $validated);

        $tournament->load(['organizer', 'stadium'])->loadCount('tournamentTeams');

        return response()->json([
            'message' => 'تم تحديث هوية البطولة بنجاح',
            'data' => new TournamentDetailResource($tournament),
        ]);
    }
}
