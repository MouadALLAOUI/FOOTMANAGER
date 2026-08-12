<?php

namespace App\Domains\Player\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlayerDashboardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = $this->resource;

        return [
            'profile' => new PlayerProfileResource(['user' => $data['profile']->user, 'profile' => $data['profile']]),
            'statistics' => new PlayerStatisticsResource($data['statistics']),
            'form' => $data['form'],
            'upcoming_match' => $data['upcoming_match'] ? new FixtureResource($data['upcoming_match']) : null,
            'recent_matches' => PlayerPerformanceResource::collection($data['recent_matches']),
            'achievements' => PlayerAchievementResource::collection($data['achievements']),
            'current_team' => $data['current_team'] ? new TeamResource($data['current_team']) : null,
            'career_history' => PlayerCareerResource::collection($data['career_history']),
            'availability' => new PlayerAvailabilityResource([
                'type' => 'schedule',
                'status' => $data['profile']->availability_status,
                'weekly' => $data['availability'],
            ]),
        ];
    }
}
