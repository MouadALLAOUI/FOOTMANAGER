<?php

namespace App\Http\Controllers\Public;

use App\Domains\Shared\Base\Controller;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Resources\TournamentContactMessageResource;
use App\Domains\Tournament\Services\TournamentContactService;
use App\Http\Requests\Public\StoreTournamentContactMessageRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicTournamentContactController extends Controller
{
    public function __construct(
        private readonly TournamentContactService $service,
    ) {}

    public function contact(Request $request, string $tournament): JsonResponse
    {
        $tournament = $this->resolveTournament($tournament);

        return response()->json(['data' => $this->service->contactPayload($tournament)]);
    }

    public function storeMessage(StoreTournamentContactMessageRequest $request, string $tournament): JsonResponse
    {
        $tournament = $this->resolveTournament($tournament);

        // Honeypot: bots tend to fill hidden fields.
        if ($request->filled('website')) {
            abort(422, 'رسالة غير صالحة');
        }

        $message = $this->service->submitMessage($tournament, $request->validated(), $request->ip());

        return response()->json(['data' => new TournamentContactMessageResource($message)], 201);
    }

    private function resolveTournament(string $key): Tournament
    {
        $tournament = ctype_digit($key)
            ? Tournament::query()->find((int) $key)
            : Tournament::query()->where('slug', $key)->first();

        if (! $tournament || ! $tournament->isVisiblePublicly()) {
            abort(404, 'البطولة غير موجودة أو غير منشورة');
        }

        return $tournament;
    }
}
