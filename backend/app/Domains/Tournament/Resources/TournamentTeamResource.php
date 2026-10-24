<?php

namespace App\Domains\Tournament\Resources;

use App\Domains\Tournament\Models\TournamentTeam;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin TournamentTeam */
class TournamentTeamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tournament_id' => $this->tournament_id,
            'team_id' => $this->team_id,
            'team' => $this->whenLoaded('team', fn () => $this->team ? [
                'id' => $this->team->id,
                'name' => $this->team->name,
                'logo_url' => $this->team->logo_url,
                'city' => $this->team->city,
                'category' => $this->team->category,
                'level' => $this->team->level,
                'is_free' => (bool) $this->team->is_free,
                'is_deleted' => (bool) ($this->team->deleted_at !== null),
            ] : null),
            'group' => $this->whenLoaded('group', fn () => $this->group ? [
                'id' => $this->group->id,
                'name' => $this->group->name,
            ] : null),
            'weekly_subscriptions' => $this->whenLoaded('team', function () {
                if (! $this->team) {
                    return [];
                }

                return $this->team->terrainBookings()
                    ->where('reservation_type', 'weekly_subscription')
                    ->whereIn('status', ['approved', 'confirmed'])
                    ->whereNull('archived_at')
                    ->whereNull('cancelled_at')
                    ->with('terrain:id,name,city')
                    ->get()
                    ->map(fn ($b) => [
                        'id' => $b->id,
                        'terrain_id' => $b->terrain_id,
                        'terrain_name' => $b->terrain?->name,
                        'day_of_week' => $b->day_of_week,
                        'start_time' => $b->start_time,
                        'end_time' => $b->end_time,
                    ])
                    ->all();
            }),
            'group_position' => $this->group_position,
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
