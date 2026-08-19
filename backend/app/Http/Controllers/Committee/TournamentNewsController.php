<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Shared\Base\Controller;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentNews;
use App\Domains\Tournament\Resources\TournamentNewsResource;
use App\Domains\Tournament\Services\TournamentContentService;
use App\Http\Requests\Committee\StoreTournamentNewsRequest;
use App\Http\Requests\Committee\UpdateTournamentNewsRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class TournamentNewsController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly TournamentContentService $service,
    ) {}

    public function index(Tournament $tournament): AnonymousResourceCollection
    {
        $this->authorize('view', $tournament);

        $news = $tournament->news()
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->get();

        return TournamentNewsResource::collection($news);
    }

    public function store(StoreTournamentNewsRequest $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $news = $this->service->createNews($tournament, $request->validated());

        return response()->json(['data' => new TournamentNewsResource($news)], 201);
    }

    public function update(UpdateTournamentNewsRequest $request, Tournament $tournament, TournamentNews $news): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $news = $this->service->updateNews($news, $request->validated());

        return response()->json(['data' => new TournamentNewsResource($news)]);
    }

    public function destroy(Tournament $tournament, TournamentNews $news): Response
    {
        $this->authorize('manage', $tournament);

        $this->service->deleteNews($news);

        return response()->noContent();
    }
}
