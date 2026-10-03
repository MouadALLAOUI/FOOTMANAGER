<?php

namespace App\Domains\Tournament\Resources;

use App\Domains\Tournament\Models\Tournament;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Tournament */
class TournamentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            'slug' => $this->slug,
            'logo_url' => $this->logo_url,
            'cover_url' => $this->cover_url,
            'primary_color' => $this->primary_color,
            'secondary_color' => $this->secondary_color,
            'description' => $this->description,
            'rules' => $this->rules,
            'location' => $this->location,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'first_match_day' => $this->first_match_day?->toDateString(),
            'status' => $this->status,
            'is_hidden' => $this->isHidden(),
            'has_settled_result' => $this->hasSettledResult(),
            'hidden_at' => $this->hidden_at?->toIso8601String(),
            'registration_start_at' => $this->registration_start_at?->toIso8601String(),
            'registration_end_at' => $this->registration_end_at?->toIso8601String(),
            'registration_fee' => $this->registration_fee,
            'requires_registration_fee' => $this->registrationRequiresFee(),
            'registration_open' => $this->canRegister(),
            'remaining_teams' => max(0, (int) $this->teams_count - $this->tournamentTeams()->count()),
            'registered_teams_count' => $this->tournamentTeams()->count(),
            'is_full' => $this->tournamentTeams()->count() >= (int) $this->teams_count,
            'registration_deadline' => $this->registration_end_at?->toIso8601String(),
            'banner_url' => $this->cover_url,
            'tournament_format' => $this->tournament_format,
            'rest_days_minimum' => $this->rest_days_minimum ?? 1,
            'league_mode' => $this->league_mode ?? 'single_round_robin',
            'terrain_reservation_mode' => $this->terrain_reservation_mode ?: 'independent',
            'teams_count' => $this->teams_count,
            'groups_count' => $this->groups_count,
            'teams_per_group' => $this->teams_per_group,
            'max_players_per_team' => $this->max_players_per_team,
            'min_players_per_team' => $this->min_players_per_team,
            'points_for_win' => $this->points_for_win,
            'points_for_draw' => $this->points_for_draw,
            'points_for_loss' => $this->points_for_loss,
            'organizer' => $this->whenLoaded('organizer', fn () => [
                'id' => $this->organizer->id,
                'name' => $this->organizer->name,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
