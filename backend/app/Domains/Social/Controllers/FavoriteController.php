<?php

namespace App\Domains\Social\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\MorphMap;
use App\Domains\Social\Resources\FavoriteResource;
use App\Domains\Social\Services\FavoriteService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FavoriteController extends Controller
{
    public function __construct(
        protected FavoriteService $favorites,
    ) {}

    public function store(Request $request): FavoriteResource
    {
        $data = $request->validate([
            'target_type' => 'required|in:stadium,team,player,match',
            'target_id' => 'required|integer',
        ]);

        $target = MorphMap::resolve($data['target_type'], (int) $data['target_id']);

        abort_if(! $target, 404, 'الهدف غير موجود.');

        return new FavoriteResource($this->favorites->add($request->user(), $target));
    }

    public function destroy(Request $request, string $targetType, int $targetId): FavoriteResource
    {
        $target = MorphMap::resolve($targetType, $targetId);

        abort_if(! $target, 404, 'الهدف غير موجود.');

        return new FavoriteResource($this->favorites->remove($request->user(), $target));
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $data = $request->validate([
            'type' => 'nullable|in:stadium,team,player,match',
        ]);

        return FavoriteResource::collection($this->favorites->list($request->user(), $data['type'] ?? null));
    }

    public function status(Request $request): FavoriteResource
    {
        $data = $request->validate([
            'target_type' => 'required|in:stadium,team,player,match',
            'target_id' => 'required|integer',
        ]);

        $target = MorphMap::resolve($data['target_type'], (int) $data['target_id']);

        abort_if(! $target, 404, 'الهدف غير موجود.');

        return new FavoriteResource($this->favorites->status($request->user(), $target));
    }
}
