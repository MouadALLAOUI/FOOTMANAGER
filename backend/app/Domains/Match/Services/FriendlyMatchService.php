<?php

namespace App\Domains\Match\Services;

use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchRequest;
use App\Models\User;

/**
 * Bridges the friendly (match_requests) flow with the shared live-match
 * event engine (matches + match_events). Starting a friendly match creates
 * (and immediately kicks off) a FootballMatch bound through match_request_id,
 * so managers can track live events and results through the same system used
 * by tournaments.
 */
class FriendlyMatchService
{
    public function __construct(protected LiveMatchService $live) {}

    /**
     * The FootballMatch created for a friendly match request, if any.
     */
    public function findForRequest(MatchRequest $matchRequest): ?FootballMatch
    {
        return FootballMatch::query()
            ->where('match_request_id', $matchRequest->id)
            ->first();
    }

    /**
     * Create the FootballMatch for a friendly match request and immediately
     * kick it off (first_half). Reuses an existing, non-closed match.
     */
    public function start(MatchRequest $matchRequest, User $user): FootballMatch
    {
        $match = $this->findForRequest($matchRequest);

        if ($match && $match->status !== MatchStatus::Cancelled && $match->status !== MatchStatus::Postponed) {
            return $match;
        }

        if ($match && $match->status === MatchStatus::Finished) {
            return $match;
        }

        $match ??= FootballMatch::query()->create([
            'match_request_id' => $matchRequest->id,
            'home_team_id' => $matchRequest->host_team_id,
            'away_team_id' => $matchRequest->opponent_team_id,
            'stadium_id' => $matchRequest->stadium_id,
            'status' => MatchStatus::Scheduled,
            'current_minute' => 0,
            'home_score' => 0,
            'away_score' => 0,
            'match_duration_minutes' => 90,
            'is_confirmed' => false,
            'created_by' => $user->id,
        ]);

        return $this->live->start($match, (int) $user->id);
    }
}