<?php

namespace App\Domains\Tournament\Resources;

use App\Domains\Competition\Enums\RoundStage;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Competition\Models\Round;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Fixture */
class TournamentFixtureResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $roundStage = $this->round?->stage;

        return [
            'id' => $this->id,
            'match_id' => $this->match_id,
            'matchday' => $this->matchday,
            'slot_type' => $this->slot_type,
            'bye_team' => $this->whenLoaded('byeTeam', fn () => $this->byeTeam ? [
                'id' => $this->byeTeam->id,
                'name' => $this->byeTeam->name,
                'logo_url' => $this->byeTeam->logo_url,
            ] : null),
            'round' => $this->whenLoaded('round', fn () => [
                'id' => $this->round->id,
                'name' => $this->round->name,
                'stage' => $this->round->stage?->value,
                'order_index' => $this->round->order_index,
            ]),
            'group' => $this->whenLoaded('group', fn () => $this->group ? [
                'id' => $this->group->id,
                'name' => $this->group->name,
            ] : null),
            'home_team' => $this->whenLoaded('homeTeam', fn () => $this->homeTeam ? [
                'id' => $this->homeTeam->id,
                'name' => $this->homeTeam->name,
                'logo_url' => $this->homeTeam->logo_url,
            ] : null),
            'away_team' => $this->whenLoaded('awayTeam', fn () => $this->awayTeam ? [
                'id' => $this->awayTeam->id,
                'name' => $this->awayTeam->name,
                'logo_url' => $this->awayTeam->logo_url,
            ] : null),
            'stadium' => $this->whenLoaded('stadium', fn () => $this->stadium ? [
                'id' => $this->stadium->id,
                'name' => $this->stadium->name,
            ] : null),
            'slots' => $roundStage !== null && $roundStage !== RoundStage::Group
                ? $this->knockoutSlots()
                : null,
            'scheduled_at' => $this->scheduled_at?->toDateTimeString(),
            'status' => $this->status?->value,
            'is_confirmed' => $this->match ? (bool) $this->match->is_confirmed : true,
            'reservation' => $this->whenLoaded('match', fn () => $this->match ? [
                'active_reservation_id' => $this->match->active_reservation_id,
                'confirmed' => (bool) $this->match->is_confirmed,
            ] : null),
            'leg' => $this->leg(),
            'match' => $this->whenLoaded('match', fn () => $this->match ? [
                'id' => $this->match->id,
                'status' => $this->match->status?->value,
                'current_period' => $this->match->current_period,
                'current_minute' => $this->match->current_minute,
                'home_score' => $this->match->home_score,
                'away_score' => $this->match->away_score,
                'home_penalties' => $this->match->home_penalties,
                'away_penalties' => $this->match->away_penalties,
                'extra_time' => (bool) $this->match->extra_time,
                'notes' => $this->match->notes,
                'winner_team_id' => $this->match->winner_team_id,
                'ended_at' => $this->match->ended_at?->toIso8601String(),
            ] : null),
        ];
    }

    /**
     * First or second leg of a double round-robin fixture (الذهاب / الإياب).
     */
    private function leg(): ?string
    {
        if (! $this->group_id || ! $this->home_team_id || ! $this->away_team_id) {
            return null;
        }

        $otherId = Fixture::query()
            ->where('competition_id', $this->competition_id)
            ->where('season_id', $this->season_id)
            ->where('group_id', $this->group_id)
            ->where('home_team_id', $this->away_team_id)
            ->where('away_team_id', $this->home_team_id)
            ->where('id', '!=', $this->id)
            ->value('id');

        if (! $otherId) {
            return null;
        }

        return $this->id < $otherId ? 'first' : 'second';
    }

    /**
     * Stable machine-readable placeholder codes for empty knockout slots.
     *
     * @return array{home: string|null, away: string|null}
     */
    private function knockoutSlots(): array
    {
        $round = $this->round;

        if (! $round) {
            return ['home' => null, 'away' => null];
        }

        $previousRound = Round::query()
            ->where('competition_id', $this->competition_id)
            ->where('season_id', $this->season_id)
            ->where('order_index', $round->order_index - 1)
            ->first();

        $index = Fixture::query()
            ->where('round_id', $round->id)
            ->where('id', '<', $this->id)
            ->count();

        if (! $previousRound || $previousRound->stage === RoundStage::Group) {
            $code = 'group_qualifier';

            return [
                'home' => $this->home_team_id ? null : $code,
                'away' => $this->away_team_id ? null : $code,
            ];
        }

        $homeSource = $index * 2 + 1;
        $awaySource = $index * 2 + 2;

        return [
            'home' => $this->home_team_id ? null : "winner_match_{$homeSource}",
            'away' => $this->away_team_id ? null : "winner_match_{$awaySource}",
        ];
    }
}
