<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Shared\Base\Controller;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentSponsor;
use App\Domains\Tournament\Resources\TournamentSponsorResource;
use App\Domains\Tournament\Services\TournamentContentService;
use App\Http\Requests\Committee\StoreTournamentSponsorRequest;
use App\Http\Requests\Committee\UpdateTournamentSponsorRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class TournamentSponsorController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly TournamentContentService $service,
    ) {}

    public function index(Tournament $tournament): AnonymousResourceCollection
    {
        $this->authorize('view', $tournament);

        $sponsors = $tournament->sponsors()
            ->orderBy('order_index')
            ->orderBy('id')
            ->get();

        return TournamentSponsorResource::collection($sponsors);
    }

    public function store(StoreTournamentSponsorRequest $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $sponsor = $this->service->storeSponsor($tournament, $request->validated());

        return response()->json(['data' => new TournamentSponsorResource($sponsor)], 201);
    }

    public function update(UpdateTournamentSponsorRequest $request, Tournament $tournament, TournamentSponsor $sponsor): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $sponsor = $this->service->updateSponsor($sponsor, $request->validated());

        return response()->json(['data' => new TournamentSponsorResource($sponsor)]);
    }

    public function destroy(Tournament $tournament, TournamentSponsor $sponsor): Response
    {
        $this->authorize('manage', $tournament);

        $this->service->deleteSponsor($sponsor);

        return response()->noContent();
    }
}
