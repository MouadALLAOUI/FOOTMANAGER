<?php

namespace App\Domains\Tournament\Resources;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Models\MatchEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Fixture */
class TournamentResultResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $match = $this->match;

        return [
            'id' => $this->id,
            'match_id' => $this->match_id,
            'matchday' => $this->matchday,
            'status' => $this->status?->value,
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'round' => $this->whenLoaded('round', fn () => $this->round ? [
                'id' => $this->round->id,
                'name' => $this->round->name,
                'stage' => $this->round->stage?->value,
            ] : null),
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
            'match' => $match ? [
                'id' => $match->id,
                'status' => $match->status?->value,
                'current_period' => $match->current_period,
                'current_minute' => $match->current_minute,
                'home_score' => $match->home_score,
                'away_score' => $match->away_score,
                'home_penalties' => $match->home_penalties,
                'away_penalties' => $match->away_penalties,
                'extra_time' => (bool) $match->extra_time,
                'notes' => $match->notes,
                'winner_team_id' => $match->winner_team_id,
                'ended_at' => $match->ended_at?->toIso8601String(),
                'referees' => $match->referees->map(fn ($row) => [
                    'role' => $row->role,
                    'referee_id' => $row->referee_id,
                    'name' => $row->referee?->name,
                ])->values(),
                'events' => $match->events->map(fn (MatchEvent $event) => [
                    'id' => $event->id,
                    'type' => $event->type?->value,
                    'icon' => $event->type?->icon(),
                    'minute' => $event->minute,
                    'added_time' => $event->added_time,
                    'period' => $event->period,
                    'description' => $event->description,
                    'metadata' => $event->metadata,
                    'team' => $event->team ? [
                        'id' => $event->team->id,
                        'name' => $event->team->name,
                    ] : null,
                    'player' => $event->player ? [
                        'id' => $event->player->id,
                        'name' => $event->player->name,
                        'number' => $event->player->number,
                    ] : null,
                    'assist_player' => $event->assistPlayer ? [
                        'id' => $event->assistPlayer->id,
                        'name' => $event->assistPlayer->name,
                        'number' => $event->assistPlayer->number,
                    ] : null,
                ])->values(),
                'statistics' => $match->statistics->map(fn ($statistic) => [
                    'team_id' => $statistic->team_id,
                    'possession' => $statistic->possession,
                    'shots' => $statistic->shots,
                    'shots_on_target' => $statistic->shots_on_target,
                    'corners' => $statistic->corners,
                    'fouls' => $statistic->fouls,
                    'offsides' => $statistic->offsides,
                    'saves' => $statistic->saves,
                    'passes' => $statistic->passes,
                    'pass_accuracy' => $statistic->pass_accuracy,
                    'expected_goals' => $statistic->expected_goals,
                ])->values(),
                'player_of_the_match' => $match->performances->firstWhere('mvp', true) ? [
                    'player_id' => $match->performances->firstWhere('mvp', true)->player_id,
                    'team_id' => $match->performances->firstWhere('mvp', true)->team_id,
                    'name' => $match->performances->firstWhere('mvp', true)->player?->name,
                    'number' => $match->performances->firstWhere('mvp', true)->player?->number,
                ] : null,
                'audits' => $match->audits->map(fn ($audit) => [
                    'id' => $audit->id,
                    'action' => $audit->action,
                    'description' => $audit->description,
                    'changes' => $audit->changes,
                    'user' => $audit->user ? [
                        'id' => $audit->user->id,
                        'name' => $audit->user->name,
                    ] : null,
                    'created_at' => $audit->created_at?->toIso8601String(),
                ])->values(),
            ] : null,
            'suspended_players' => $this->additional['suspended_players'] ?? [],
        ];
    }
}
