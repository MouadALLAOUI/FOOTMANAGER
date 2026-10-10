<?php

namespace App\Domains\Tournament\Resources;

use App\Domains\Competition\Enums\RoundStage;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Competition\Models\Round;
use App\Domains\Tournament\Models\Tournament;
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
            'unscheduled_reason' => $this->unscheduled_reason,
            'postponement_reason' => $this->postponement_reason,
            'postponement_note' => $this->postponement_note,
            'postponed_from_date' => $this->postponed_from_date?->toDateTimeString(),
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
                'current_half' => $this->match->currentHalf(),
                'current_minute' => $this->match->current_minute,
                'home_score' => $this->match->home_score,
                'away_score' => $this->match->away_score,
                'home_penalties' => $this->match->home_penalties,
                'away_penalties' => $this->match->away_penalties,
                'extra_time' => (bool) $this->match->extra_time,
                'notes' => $this->match->notes,
                'winner_team_id' => $this->match->winner_team_id,
                'match_duration_minutes' => (int) $this->match->match_duration_minutes,
                'half_duration_minutes' => $this->tournament()?->halfDurationMinutes(),
                'first_half_extra_minutes' => $this->tournament()?->first_half_extra_minutes ?? 0,
                'second_half_extra_minutes' => $this->tournament()?->second_half_extra_minutes ?? 0,
                'started_at' => $this->match->started_at?->toIso8601String(),
                'kicked_off_at' => $this->match->kicked_off_at?->toIso8601String(),
                'second_half_started_at' => $this->match->second_half_started_at?->toIso8601String(),
                'ended_at' => $this->match->ended_at?->toIso8601String(),
            ] : null),
            'delegated_link' => $this->whenLoaded('delegatedToken', fn () => $this->delegatedToken ? [
                'id' => $this->delegatedToken->id,
                'status' => $this->delegatedToken->status,
                'mode' => $this->delegatedToken->mode ?? 'full',
                'valid_from' => $this->delegatedToken->valid_from?->toIso8601String(),
                'valid_until' => $this->delegatedToken->valid_until?->toIso8601String(),
                'recorder_name' => $this->delegatedToken->recorder_name,
                'recorder_phone' => $this->delegatedToken->recorder_phone,
            ] : null),
            'has_unassigned_events' => $this->checkHasUnassignedEvents(),
            'delegated_submission' => $this->whenLoaded('latestPendingSubmission', fn () => $this->latestPendingSubmission ? [
                'id' => $this->latestPendingSubmission->id,
                'status' => $this->latestPendingSubmission->status,
                'home_score' => $this->latestPendingSubmission->home_score,
                'away_score' => $this->latestPendingSubmission->away_score,
                'extra_time' => (bool) $this->latestPendingSubmission->extra_time,
                'home_penalties' => $this->latestPendingSubmission->home_penalties,
                'away_penalties' => $this->latestPendingSubmission->away_penalties,
                'recorder_name' => $this->latestPendingSubmission->recorder_name,
                'recorder_phone' => $this->latestPendingSubmission->recorder_phone,
                'anomalies' => $this->latestPendingSubmission->anomalies ?? [],
                'is_disputed' => (bool) $this->latestPendingSubmission->is_disputed,
                'dispute_reason' => $this->latestPendingSubmission->dispute_reason,
                'submitted_at' => $this->latestPendingSubmission->created_at?->toIso8601String(),
                'events' => $this->latestPendingSubmission->events ?? [],
                'notes' => $this->latestPendingSubmission->notes,
                'client_meta' => $this->latestPendingSubmission->client_meta ?? [],
            ] : null),
        ];
    }

    /**
     * First or second leg of a double round-robin fixture (الذهاب / الإياب).
     */
    private function leg(): ?string
    {
        if (! $this->home_team_id || ! $this->away_team_id) {
            return null;
        }

        $otherId = Fixture::query()
            ->where('competition_id', $this->competition_id)
            ->where('season_id', $this->season_id)
            ->when($this->group_id, fn ($q) => $q->where('group_id', $this->group_id))
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

    private ?Tournament $resolvedTournament = null;

    private function tournament(): ?Tournament
    {
        if ($this->resolvedTournament !== null) {
            return $this->resolvedTournament;
        }

        if (! $this->competition_id || ! $this->season_id) {
            return null;
        }

        return $this->resolvedTournament = Tournament::query()
            ->where('competition_id', $this->competition_id)
            ->where('season_id', $this->season_id)
            ->first();
    }

    private function checkHasUnassignedEvents(): bool
    {
        if ($this->match_id) {
            $hasUnassigned = \App\Domains\Match\Models\MatchEvent::query()
                ->where('match_id', $this->match_id)
                ->whereNull('player_id')
                ->whereIn('type', [
                    \App\Domains\Match\Enums\MatchEventType::Goal->value,
                    \App\Domains\Match\Enums\MatchEventType::PenaltyGoal->value,
                    \App\Domains\Match\Enums\MatchEventType::Foul->value,
                ])
                ->exists();

            if ($hasUnassigned) {
                return true;
            }
        }

        if ($this->relationLoaded('latestPendingSubmission') && $this->latestPendingSubmission) {
            $rawEvents = is_array($this->latestPendingSubmission->events)
                ? $this->latestPendingSubmission->events
                : (json_decode($this->latestPendingSubmission->events ?? '[]', true) ?: []);

            foreach ($rawEvents as $ev) {
                if (empty($ev['player_id']) && empty($ev['player']) && in_array($ev['type'] ?? '', ['goal', 'penalty_goal', 'foul'], true)) {
                    return true;
                }
            }
        }

        return false;
    }
}
