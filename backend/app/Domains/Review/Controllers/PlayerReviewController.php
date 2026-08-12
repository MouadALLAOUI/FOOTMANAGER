<?php

namespace App\Domains\Review\Controllers;

use App\Domains\Match\Models\FootballMatch;
use App\Domains\Player\Models\Player;
use App\Domains\Review\Models\PlayerReview;
use App\Domains\Review\Queries\PlayerReviewQuery;
use App\Domains\Review\Resources\PlayerReviewResource;
use App\Domains\Review\Services\ReviewService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class PlayerReviewController extends Controller
{
    public function __construct(
        protected ReviewService $reviews,
        protected PlayerReviewQuery $query,
    ) {}

    public function index(Request $request, Player $player): AnonymousResourceCollection
    {
        $query = $this->query->applySort(
            $this->query->base($player),
            $request->query('sort'),
        );

        return PlayerReviewResource::collection($query->paginate($request->integer('per_page', 10)));
    }

    public function store(Request $request, Player $player, FootballMatch $match): PlayerReviewResource
    {
        $data = $request->validate([
            'rating' => 'required|integer|between:1,5',
            'sportsmanship' => 'required|integer|between:1,5',
            'teamwork' => 'required|integer|between:1,5',
            'skill' => 'required|integer|between:1,5',
            'punctuality' => 'required|integer|between:1,5',
            'comment' => 'nullable|string|max:2000',
            'is_anonymous' => 'nullable|boolean',
        ]);

        Gate::authorize('create', $player);

        $review = $this->reviews->reviewPlayer($request->user(), $player, $match, $data);

        return new PlayerReviewResource($review->load('reviewer:id,name', 'reviewer.playerProfile:id,user_id,photo_path'));
    }

    public function update(Request $request, PlayerReview $review): PlayerReviewResource
    {
        $data = $request->validate([
            'rating' => 'sometimes|integer|between:1,5',
            'sportsmanship' => 'sometimes|integer|between:1,5',
            'teamwork' => 'sometimes|integer|between:1,5',
            'skill' => 'sometimes|integer|between:1,5',
            'punctuality' => 'sometimes|integer|between:1,5',
            'comment' => 'nullable|string|max:2000',
            'is_anonymous' => 'nullable|boolean',
        ]);

        Gate::authorize('update', $review);

        $review = $this->reviews->updatePlayerReview($request->user(), $review, $data);

        return new PlayerReviewResource($review->load('reviewer:id,name', 'reviewer.playerProfile:id,user_id,photo_path'));
    }

    public function destroy(Request $request, PlayerReview $review): JsonResponse
    {
        Gate::authorize('delete', $review);

        $this->reviews->deletePlayerReview($request->user(), $review);

        return response()->json(['message' => 'تم حذف التقييم.']);
    }
}
