<?php

namespace App\Domains\Review\Controllers;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Review\Models\StadiumReview;
use App\Domains\Review\Queries\StadiumReviewQuery;
use App\Domains\Review\Resources\StadiumReviewResource;
use App\Domains\Review\Services\ReviewService;
use App\Domains\Shared\Base\Controller;
use App\Domains\Stadium\Models\Stadium;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class StadiumReviewController extends Controller
{
    public function __construct(
        protected ReviewService $reviews,
        protected StadiumReviewQuery $query,
    ) {}

    public function index(Request $request, Stadium $stadium): AnonymousResourceCollection
    {
        $query = $this->query->applySort(
            $this->query->base($stadium),
            $request->query('sort'),
        );

        return StadiumReviewResource::collection($query->paginate($request->integer('per_page', 10)));
    }

    public function store(Request $request, Stadium $stadium, TerrainBooking $booking): StadiumReviewResource
    {
        $data = $request->validate([
            'overall_rating' => 'required|integer|between:1,5',
            'field_quality' => 'nullable|integer|between:1,5',
            'lighting' => 'nullable|integer|between:1,5',
            'cleanliness' => 'nullable|integer|between:1,5',
            'facilities' => 'nullable|integer|between:1,5',
            'parking' => 'nullable|integer|between:1,5',
            'comment' => 'nullable|string|max:2000',
            'recommend' => 'nullable|boolean',
        ]);

        Gate::authorize('create', $stadium);

        $review = $this->reviews->reviewStadium($request->user(), $stadium, $booking, $data);

        return new StadiumReviewResource($review->load('user:id,name', 'user.playerProfile:id,user_id,photo_path'));
    }

    public function update(Request $request, StadiumReview $review): StadiumReviewResource
    {
        $data = $request->validate([
            'overall_rating' => 'sometimes|integer|between:1,5',
            'field_quality' => 'nullable|integer|between:1,5',
            'lighting' => 'nullable|integer|between:1,5',
            'cleanliness' => 'nullable|integer|between:1,5',
            'facilities' => 'nullable|integer|between:1,5',
            'parking' => 'nullable|integer|between:1,5',
            'comment' => 'nullable|string|max:2000',
            'recommend' => 'nullable|boolean',
        ]);

        Gate::authorize('update', $review);

        $review = $this->reviews->updateStadiumReview($request->user(), $review, $data);

        return new StadiumReviewResource($review->load('user:id,name', 'user.playerProfile:id,user_id,photo_path'));
    }

    public function destroy(Request $request, StadiumReview $review): JsonResponse
    {
        Gate::authorize('delete', $review);

        $this->reviews->deleteStadiumReview($request->user(), $review);

        return response()->json(['message' => 'تم حذف التقييم.']);
    }
}
