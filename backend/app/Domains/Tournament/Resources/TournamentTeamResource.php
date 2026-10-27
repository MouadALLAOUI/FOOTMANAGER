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
                'manager_name' => $this->team->manager?->name,
                'manager_phone' => $this->team->manager?->phone,
                'players_count' => $this->team->players()->count(),
            ] : null),
            'group' => $this->whenLoaded('group', fn () => $this->group ? [
                'id' => $this->group->id,
                'name' => $this->group->name,
            ] : null),
            'weekly_subscriptions' => $this->team ? $this->team->terrainBookings()
                ->whereIn('status', ['approved', 'confirmed'])
                ->whereNull('archived_at')
                ->where('reservation_type', 'weekly_subscription')
                ->with('terrain')
                ->get()
                ->map(fn ($b) => [
                    'id' => $b->id,
                    'day_of_week' => $b->day_of_week,
                    'day_name' => [0 => 'الأحد', 1 => 'الاثنين', 2 => 'الثلاثاء', 3 => 'الأربعاء', 4 => 'الخميس', 5 => 'الجمعة', 6 => 'السبت'][$b->day_of_week] ?? null,
                    'start_time' => $b->start_time ? substr($b->start_time, 0, 5) : null,
                    'end_time' => $b->end_time ? substr($b->end_time, 0, 5) : null,
                    'start_date' => $b->start_date?->toDateString(),
                    'end_date' => $b->end_date?->toDateString(),
                    'terrain' => $b->terrain ? [
                        'id' => $b->terrain->id,
                        'name' => $b->terrain->name,
                        'city' => $b->terrain->city,
                    ] : null,
                ]) : [],
            'group_position' => $this->group_position,
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
