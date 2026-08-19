<?php

namespace App\Http\Controllers\Committee;

use App\Domains\Shared\Base\Controller;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentGalleryImage;
use App\Domains\Tournament\Resources\TournamentGalleryImageResource;
use App\Domains\Tournament\Services\TournamentContentService;
use App\Http\Requests\Committee\StoreTournamentGalleryImageRequest;
use App\Http\Requests\Committee\UpdateTournamentGalleryImageRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class TournamentGalleryController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly TournamentContentService $service,
    ) {}

    public function index(Tournament $tournament): AnonymousResourceCollection
    {
        $this->authorize('view', $tournament);

        $images = $tournament->galleryImages()
            ->orderBy('order_index')
            ->orderBy('id')
            ->get();

        return TournamentGalleryImageResource::collection($images);
    }

    public function store(StoreTournamentGalleryImageRequest $request, Tournament $tournament): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $image = $this->service->storeGalleryImage($tournament, $request->validated());

        return response()->json(['data' => new TournamentGalleryImageResource($image)], 201);
    }

    public function update(UpdateTournamentGalleryImageRequest $request, Tournament $tournament, TournamentGalleryImage $image): JsonResponse
    {
        $this->authorize('manage', $tournament);

        $image = $this->service->updateGalleryImage($image, $request->validated());

        return response()->json(['data' => new TournamentGalleryImageResource($image)]);
    }

    public function destroy(Tournament $tournament, TournamentGalleryImage $image): Response
    {
        $this->authorize('manage', $tournament);

        $this->service->deleteGalleryImage($image);

        return response()->noContent();
    }
}
