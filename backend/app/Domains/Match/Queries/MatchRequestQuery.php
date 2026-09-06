<?php

namespace App\Domains\Match\Queries;

use App\Domains\Match\Models\MatchRequest;
use Illuminate\Database\Eloquent\Builder;

/**
 * Query objects for the manager match-request inbox.
 */
class MatchRequestQuery
{
    /** Requests where the team participates as host or opponent, newest first. */
    public static function forTeam(int $teamId, ?string $status = null): Builder
    {
        return MatchRequest::query()
            ->with([
                'stadium.images',
                'hostTeam',
                'opponentTeam.manager',
                'targetTeam',
                'playerApplications',
                'footballMatch.events.team',
                'footballMatch.events.player',
                'footballMatch.events.assistPlayer',
            ])
            ->withCount(['playerApplications as players_joined_count' => fn ($q) => $q->where('status', 'accepted')])
            ->where(fn (Builder $q) => $q->where('host_team_id', $teamId)->orWhere('opponent_team_id', $teamId))
            ->when($status && $status !== 'all', fn (Builder $q) => $q->where('status', $status))
            ->latest('match_datetime');
    }

    /** Open direct challenges targeting the team. */
    public static function receivedChallenges(int $teamId): Builder
    {
        return MatchRequest::query()
            ->with(['hostTeam.manager', 'stadium.images', 'targetTeam', 'playerApplications'])
            ->withCount(['playerApplications as players_joined_count' => fn ($q) => $q->where('status', 'accepted')])
            ->where('target_team_id', $teamId)
            ->where('type', 'direct_challenge')
            ->where('status', 'open')
            ->whereHas('hostTeam.manager', fn ($q) => $q->where('status', 'approved'))
            ->latest('match_datetime');
    }
}
