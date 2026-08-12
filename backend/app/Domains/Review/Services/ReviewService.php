<?php

namespace App\Domains\Review\Services;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Player\Models\Player;
use App\Domains\Review\Events\PlayerReviewed;
use App\Domains\Review\Events\StadiumReviewed;
use App\Domains\Review\Models\PlayerReview;
use App\Domains\Review\Models\StadiumReview;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Stadium\Models\Stadium;
use App\Models\User;

class ReviewService
{
    public function reviewPlayer(User $user, Player $player, FootballMatch $match, array $data): PlayerReview
    {
        if ($player->user_id && (int) $player->user_id === (int) $user->id) {
            throw new DomainException('لا يمكنك تقييم نفسك.', 422);
        }

        $exists = PlayerReview::query()
            ->where('player_id', $player->id)
            ->where('match_id', $match->id)
            ->where('reviewer_id', $user->id)
            ->exists();

        if ($exists) {
            throw new DomainException('قمت بتقييم هذا اللاعب في هذه المباراة مسبقاً.', 422);
        }

        $review = PlayerReview::query()->create(array_merge($data, [
            'player_id' => $player->id,
            'match_id' => $match->id,
            'reviewer_id' => $user->id,
        ]));

        PlayerReviewed::dispatch($review);

        return $review;
    }

    public function reviewStadium(User $user, Stadium $stadium, TerrainBooking $booking, array $data): StadiumReview
    {
        if ((int) $booking->manager_id !== (int) $user->id) {
            throw new DomainException('لا يمكنك تقييم حجز لا يخصك.', 403);
        }

        if ((int) $booking->terrain_id !== (int) $stadium->id) {
            throw new DomainException('الحجز لا يتبع هذا الملعب.', 422);
        }

        $exists = StadiumReview::query()
            ->where('user_id', $user->id)
            ->where('booking_id', $booking->id)
            ->exists();

        if ($exists) {
            throw new DomainException('قمت بتقييم هذا الحجز مسبقاً.', 422);
        }

        $review = StadiumReview::query()->create(array_merge($data, [
            'stadium_id' => $stadium->id,
            'user_id' => $user->id,
            'booking_id' => $booking->id,
        ]));

        StadiumReviewed::dispatch($review);

        return $review;
    }

    public function updatePlayerReview(User $user, PlayerReview $review, array $data): PlayerReview
    {
        if ((int) $review->reviewer_id !== (int) $user->id && ! $user->isAdmin()) {
            throw new DomainException('لا يمكنك تعديل هذا التقييم.', 403);
        }

        $review->update($data);

        PlayerReviewed::dispatch($review);

        return $review;
    }

    public function updateStadiumReview(User $user, StadiumReview $review, array $data): StadiumReview
    {
        if ((int) $review->user_id !== (int) $user->id && ! $user->isAdmin()) {
            throw new DomainException('لا يمكنك تعديل هذا التقييم.', 403);
        }

        $review->update($data);

        StadiumReviewed::dispatch($review);

        return $review;
    }

    public function deletePlayerReview(User $user, PlayerReview $review): void
    {
        if ((int) $review->reviewer_id !== (int) $user->id && ! $user->isAdmin()) {
            throw new DomainException('لا يمكنك حذف هذا التقييم.', 403);
        }

        $review->delete();

        PlayerReviewed::dispatch($review);
    }

    public function deleteStadiumReview(User $user, StadiumReview $review): void
    {
        if ((int) $review->user_id !== (int) $user->id && ! $user->isAdmin()) {
            throw new DomainException('لا يمكنك حذف هذا التقييم.', 403);
        }

        $review->delete();

        StadiumReviewed::dispatch($review);
    }
}
