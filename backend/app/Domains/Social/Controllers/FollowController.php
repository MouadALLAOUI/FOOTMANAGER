<?php

namespace App\Domains\Social\Controllers;

use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\MorphMap;
use App\Domains\Social\Resources\FollowResource;
use App\Domains\Social\Services\FollowService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FollowController extends Controller
{
    public function __construct(
        protected FollowService $follows,
    ) {}

    public function store(Request $request): FollowResource
    {
        $data = $request->validate([
            'target_type' => 'required|in:team,player,stadium',
            'target_id' => 'required|integer',
        ]);

        $target = MorphMap::resolve($data['target_type'], (int) $data['target_id']);

        abort_if(! $target, 404, 'الهدف غير موجود.');

        return new FollowResource($this->follows->follow($request->user(), $target));
    }

    public function destroy(Request $request, string $targetType, int $targetId): FollowResource
    {
        $target = MorphMap::resolve($targetType, $targetId);

        abort_if(! $target, 404, 'الهدف غير موجود.');

        return new FollowResource($this->follows->unfollow($request->user(), $target));
    }

    public function followers(Request $request): AnonymousResourceCollection
    {
        $data = $request->validate([
            'target_type' => 'required|in:team,player,stadium',
            'target_id' => 'required|integer',
        ]);

        $target = MorphMap::resolve($data['target_type'], (int) $data['target_id']);

        abort_if(! $target, 404, 'الهدف غير موجود.');

        return FollowResource::collection($this->follows->followers($target));
    }

    public function following(Request $request): AnonymousResourceCollection
    {
        $data = $request->validate([
            'type' => 'nullable|in:team,player,stadium',
        ]);

        return FollowResource::collection($this->follows->following($request->user(), $data['type'] ?? null));
    }

    public function status(Request $request): FollowResource
    {
        $data = $request->validate([
            'target_type' => 'required|in:team,player,stadium',
            'target_id' => 'required|integer',
        ]);

        $target = MorphMap::resolve($data['target_type'], (int) $data['target_id']);

        abort_if(! $target, 404, 'الهدف غير موجود.');

        return new FollowResource($this->follows->status($request->user(), $target));
    }
}
