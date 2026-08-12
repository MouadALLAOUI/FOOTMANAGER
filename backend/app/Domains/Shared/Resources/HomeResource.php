<?php

namespace App\Domains\Shared\Resources;

use App\Domains\Leaderboard\Resources\StatsResource;
use App\Domains\Match\Resources\MatchFeedResource;
use App\Domains\Stadium\Resources\StadiumResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HomeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'platform' => $this->resource['platform'] ?? [],
            'announcement' => $this->resource['announcement'] ?? null,
            'stats' => new StatsResource($this->resource['stats'] ?? []),
            'live_matches_count' => $this->resource['live_matches_count'] ?? 0,
            'top_stadiums' => StadiumResource::collection($this->resource['top_stadiums'] ?? []),
            'latest_matches' => MatchFeedResource::collection($this->resource['latest_matches'] ?? []),
        ];
    }
}
