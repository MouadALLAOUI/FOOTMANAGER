<?php

namespace App\Domains\Review\Queries;

use App\Domains\Review\Models\StadiumReview;
use App\Domains\Stadium\Models\Stadium;
use Illuminate\Database\Eloquent\Builder;

class StadiumReviewQuery
{
    public function base(Stadium $stadium): Builder
    {
        return StadiumReview::query()
            ->where('stadium_id', $stadium->id)
            ->where('status', StadiumReview::STATUS_ACTIVE)
            ->with('user:id,name')
            ->with('user.playerProfile:id,user_id,photo_path');
    }

    public function applySort(Builder $query, ?string $sort): Builder
    {
        return match ($sort) {
            'highest' => $query->orderByDesc('overall_rating'),
            'lowest' => $query->orderBy('overall_rating'),
            default => $query->orderByDesc('created_at'),
        };
    }
}
