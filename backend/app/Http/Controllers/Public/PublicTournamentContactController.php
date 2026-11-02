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
        $cleanKey = trim($key);
        $decodedKey = trim(rawurldecode($key));
        $tournament = is_numeric($cleanKey)
            ? Tournament::query()->whereKey((int) $cleanKey)->first()
            : Tournament::query()
                ->where('slug', $cleanKey)
                ->orWhere('slug', $decodedKey)
                ->orWhere('uuid', $cleanKey)
                ->orWhere('name', $cleanKey)
                ->orWhere('name', $decodedKey)
                ->first();

        $user = request()->user();
        $isOwnerOrAdmin = $user && ($user->role === 'admin' || ($tournament && (int) $user->id === (int) $tournament->organizer_id));

        if (! $tournament || (! $isOwnerOrAdmin && $tournament->isHidden())) {
            abort(404, 'البطولة غير موجودة أو غير منشورة');
        }

        return $tournament;
    }
}
