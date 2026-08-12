<?php

namespace App\Domains\Player\Controllers;

use App\Domains\Player\Models\PlayerGalleryImage;
use App\Domains\Player\Resources\PlayerGalleryImageResource;
use App\Domains\Player\Services\PlayerGalleryService;
use App\Domains\Player\Services\PlayerProfileService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GalleryController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private PlayerGalleryService $service,
        private PlayerProfileService $profiles,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => PlayerGalleryImageResource::collection($this->service->index($request->user())),
        ]);
    }

    public function indexForUser(Request $request, int $userId): JsonResponse
    {
        $profile = $this->profiles->findForUser($userId);

        if (! $profile) {
            return response()->json(['message' => 'Profile not found.'], 404);
        }

        $this->authorize('view', $profile);

        return response()->json([
            'data' => PlayerGalleryImageResource::collection($this->service->index($profile->user)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:4096'],
            'category' => ['sometimes', 'in:training,matches,awards,profile,cover'],
            'caption' => ['sometimes', 'string', 'max:255'],
            'is_cover' => ['sometimes', 'boolean'],
            'order_index' => ['sometimes', 'integer', 'min:0'],
        ]);

        $max = (int) config('player.gallery.max_images', 20);
        if ($request->user()->galleryImages()->count() >= $max) {
            return response()->json(['message' => "Gallery limit of {$max} images reached."], 422);
        }

        $image = $this->service->store($request->user(), $request->all());

        return response()->json([
            'data' => new PlayerGalleryImageResource($image),
        ], 201);
    }

    public function update(Request $request, PlayerGalleryImage $image): JsonResponse
    {
        $this->authorize('update', $image);

        $request->validate([
            'caption' => ['sometimes', 'string', 'max:255'],
            'category' => ['sometimes', 'in:training,matches,awards,profile,cover'],
            'order_index' => ['sometimes', 'integer', 'min:0'],
        ]);

        $image = $this->service->update($request->user(), $image, $request->all());

        return response()->json([
            'data' => new PlayerGalleryImageResource($image),
        ]);
    }

    public function setCover(Request $request, PlayerGalleryImage $image): JsonResponse
    {
        $this->authorize('update', $image);

        $image = $this->service->setCover($request->user(), $image);

        return response()->json([
            'data' => new PlayerGalleryImageResource($image),
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'ordered_ids' => ['required', 'array'],
            'ordered_ids.*' => ['integer'],
        ]);

        $this->service->reorder($request->user(), $request->input('ordered_ids'));

        return response()->json(['data' => $this->service->index($request->user())->map->id]);
    }

    public function destroy(Request $request, PlayerGalleryImage $image): JsonResponse
    {
        $this->authorize('delete', $image);

        $this->service->destroy($request->user(), $image);

        return response()->json(['message' => 'Image deleted.'], 200);
    }
}
