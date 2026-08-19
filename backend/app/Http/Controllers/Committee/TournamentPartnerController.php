<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Shared\Base\Controller;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentPartner;
use App\Domains\Tournament\Resources\TournamentPartnerResource;
use App\Domains\Tournament\Services\TournamentContentService;
use App\Http\Requests\Committee\StoreTournamentPartnerRequest;
use App\Http\Requests\Committee\UpdateTournamentPartnerRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class TournamentPartnerController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly TournamentContentService $service,
    ) {}

    public function index(Tournament $tournament): AnonymousResourceCollection
    {
        $this->authorize('view', $tournament);

        $partners = $tournament->partners()
            ->orderBy('order_index')
            ->orderBy('id')
            ->get();

        return TournamentPartnerResource::collection($partners);
    }

    public function store(StoreTournamentPartnerRequest $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $partner = $this->service->storePartner($tournament, $request->validated());

        return response()->json(['data' => new TournamentPartnerResource($partner)], 201);
    }

    public function update(UpdateTournamentPartnerRequest $request, Tournament $tournament, TournamentPartner $partner): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $partner = $this->service->updatePartner($partner, $request->validated());

        return response()->json(['data' => new TournamentPartnerResource($partner)]);
    }

    public function destroy(Tournament $tournament, TournamentPartner $partner): Response
    {
        $this->authorize('manage', $tournament);

        $this->service->deletePartner($partner);

        return response()->noContent();
    }
}
