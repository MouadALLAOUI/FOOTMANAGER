<?php

namespace App\Domains\Tournament\Resources;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Tournament\Models\Tournament;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Tournament */
class TournamentDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $seasonId = $this->season_id;

        $fixturesCount = $this->competition_id && $seasonId
            ? Fixture::query()
                ->where('competition_id', $this->competition_id)
                ->where('season_id', $seasonId)
                ->count()
            : 0;

        $finishedMatches = $this->competition_id && $seasonId
            ? FootballMatch::query()
                ->where('competition_id', $this->competition_id)
                ->where('season_id', $seasonId)
                ->where('status', MatchStatus::Finished)
                ->count()
            : 0;

        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            'slug' => $this->slug,
            'edition' => $this->edition,
            'category' => $this->category,
            'logo_url' => $this->logo_url,
            'cover_url' => $this->cover_url,
            'primary_color' => $this->primary_color,
            'secondary_color' => $this->secondary_color,
            'description' => $this->description,
            'rules' => $this->rules,
            'location' => $this->location,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'status' => $this->status,
            'is_hidden' => $this->isHidden(),
            'hidden_at' => $this->hidden_at?->toIso8601String(),
            'registration_start_at' => $this->registration_start_at?->toIso8601String(),
            'registration_end_at' => $this->registration_end_at?->toIso8601String(),
            'registration_fee' => $this->registration_fee,
            'requires_registration_fee' => $this->registrationRequiresFee(),
            'registration_open' => $this->canRegister(),
            'tournament_format' => $this->tournament_format,
            'teams_count' => $this->teams_count,
            'groups_count' => $this->groups_count,
            'teams_per_group' => $this->teams_per_group,
            'max_players_per_team' => $this->max_players_per_team,
            'group_mode' => $this->group_mode ?? 'fixed',
            'match_duration_minutes' => $this->match_duration_minutes ?? 90,
            'matches_per_day' => $this->matches_per_day,
            'knockout_teams' => $this->knockout_teams,
            'qualify_per_group' => $this->qualify_per_group,
            'points_for_win' => $this->points_for_win,
            'points_for_draw' => $this->points_for_draw,
            'points_for_loss' => $this->points_for_loss,
            'competition_id' => $this->competition_id,
            'season_id' => $this->season_id,
            'published_at' => $this->published_at?->toIso8601String(),
            'draw_confirmed_at' => $this->draw_confirmed_at?->toIso8601String(),
            'stadium' => $this->whenLoaded('stadium', fn () => $this->stadium ? [
                'id' => $this->stadium->id,
                'name' => $this->stadium->name,
                'city' => $this->stadium->city,
                'address' => $this->stadium->address,
                'latitude' => $this->stadium->latitude !== null ? (float) $this->stadium->latitude : null,
                'longitude' => $this->stadium->longitude !== null ? (float) $this->stadium->longitude : null,
                'google_maps_url' => $this->stadium->google_maps_url,
                'price_per_hour' => $this->stadium->price_per_hour !== null ? (float) $this->stadium->price_per_hour : null,
                'price_per_team' => $this->stadium->price_per_team !== null ? (float) $this->stadium->price_per_team : null,
                'total_price' => $this->stadium->total_price !== null ? (float) $this->stadium->total_price : null,
                'price' => $this->stadiumPrice(),
                'is_free' => $this->stadiumPrice() === null,
            ] : null),
            'organizer' => $this->whenLoaded('organizer', fn () => [
                'id' => $this->organizer->id,
                'name' => $this->organizer->name,
            ]),
            'stats' => [
                'registered_teams' => $this->tournament_teams_count ?? $this->tournamentTeams()->count(),
                'remaining_teams' => max(0, (int) $this->teams_count - ($this->tournament_teams_count ?? $this->tournamentTeams()->count())),
                'pending_registrations' => $this->pendingRegistrations()->count(),
                'groups' => $this->groups_count,
                'fixtures' => $fixturesCount,
                'finished_matches' => $finishedMatches,
                'champion_team_id' => ($this->plan ?? [])['champion_team_id'] ?? null,
            ],
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    /**
     * Effective venue price for a tournament, preferring the full booking price.
     */
    private function stadiumPrice(): ?float
    {
        $stadium = $this->stadium;

        if (! $stadium) {
            return null;
        }

        $price = $stadium->total_price ?? $stadium->price_per_team ?? $stadium->price_per_hour;

        return $price !== null && (float) $price > 0 ? (float) $price : null;
    }
}
