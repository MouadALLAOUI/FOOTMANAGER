<?php

namespace App\Domains\Team\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DashboardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'team' => new TeamResource($this->resource['team']),
            'upcoming_fixture' => $this->resource['upcoming_fixture'] ? new FixtureResource($this->resource['upcoming_fixture']) : null,
            'recent_results' => FixtureResource::collection($this->resource['recent_results']),
            'attendance_summary' => $this->resource['attendance_summary'],
            'announcements' => AnnouncementResource::collection($this->resource['announcements']),
            'statistics' => new TeamStatisticsResource($this->resource['statistics']),
            'formation' => new FormationResource($this->resource['formation']),
            'newest_players' => $this->resource['newest_players'],
        ];
    }
}
