<?php

namespace App\Domains\Tournament\Resources;

use App\Domains\Tournament\Models\Tournament;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Tournament */
class ManagerTournamentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $teamId = $request->user()?->team?->id;

        $myStatus = null;
        if ($teamId && $this->relationLoaded('allRegistrations')) {
            $registration = $this->allRegistrations->first(fn ($pivot) => (int) $pivot->team_id === (int) $teamId);
            $myStatus = $registration?->status;
        }

        $registered = $this->tournament_teams_count ?? $this->tournamentTeams()->count();
        $remaining = max(0, (int) $this->teams_count - (int) $registered);

        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'rules' => $this->rules,
            'location' => $this->location,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'status' => $this->status,
            'tournament_format' => $this->tournament_format,
            'teams_count' => $this->teams_count,
            'groups_count' => $this->groups_count,
            'teams_per_group' => $this->teams_per_group,
            'registration_start_at' => $this->registration_start_at?->toIso8601String(),
            'registration_end_at' => $this->registration_end_at?->toIso8601String(),
            'registration_fee' => $this->registration_fee,
            'requires_registration_fee' => $this->registrationRequiresFee(),
            'my_registration' => $myStatus,
            'can_register' => $this->canRegister() && $myStatus === null,
            'registered_teams' => $registered,
            'remaining_teams' => $remaining,
            'organizer' => $this->whenLoaded('organizer', fn () => [
                'id' => $this->organizer->id,
                'name' => $this->organizer->name,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
