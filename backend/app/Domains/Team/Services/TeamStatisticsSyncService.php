<?php

namespace App\Domains\Team\Services;

use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchRequest;
use App\Domains\Shared\Support\PublicCache;
use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Models\Team;
use Illuminate\Support\Collection;

class TeamStatisticsSyncService
{
    /**
     * Recalculate and persist all-time statistics for a single team
     * across ALL tournaments/competitions and completed friendly matches.
     */
    public function syncTeam(Team|int $team): Team
    {
        if (is_int($team)) {
            $team = Team::findOrFail($team);
        }

        $teamId = (int) $team->id;

        // 1. Collect match IDs from played tournament fixtures
        $fixtureMatchIds = Fixture::query()
            ->where(function ($q) use ($teamId) {
                $q->where('home_team_id', $teamId)->orWhere('away_team_id', $teamId);
            })
            ->whereIn('status', ['played', FixtureStatus::Played])
            ->whereNotNull('match_id')
            ->pluck('match_id');

        // All finished tournament matches from all competitions
        $tournamentMatches = FootballMatch::query()
            ->where(function ($q) use ($fixtureMatchIds) {
                $q->whereIn('status', [MatchStatus::Finished, 'finished', 'played', 'completed'])
                  ->orWhereIn('id', $fixtureMatchIds);
            })
            ->where(function ($q) use ($teamId) {
                $q->where('home_team_id', $teamId)->orWhere('away_team_id', $teamId);
            })
            ->get(['id', 'home_team_id', 'away_team_id', 'home_score', 'away_score', 'winner_team_id']);

        // 2. All completed & confirmed friendly matches (excluding matches linked to FootballMatch)
        $linkedReqIds = FootballMatch::whereNotNull('match_request_id')->pluck('match_request_id');
        $friendlyMatches = MatchRequest::query()
            ->whereIn('status', ['completed', 'finished', 'played'])
            ->where(function ($q) {
                $q->where('score_status', 'confirmed')->orWhereNotNull('host_score');
            })
            ->whereNotIn('id', $linkedReqIds)
            ->where(function ($q) use ($teamId) {
                $q->where('host_team_id', $teamId)->orWhere('opponent_team_id', $teamId);
            })
            ->get(['id', 'host_team_id', 'opponent_team_id', 'host_score', 'opponent_score']);

        $matchesPlayed = 0;
        $wins = 0;
        $draws = 0;
        $losses = 0;
        $goalsFor = 0;
        $goalsAgainst = 0;

        foreach ($tournamentMatches as $m) {
            $matchesPlayed++;
            $isHome = (int) $m->home_team_id === $teamId;
            $scored = (int) ($isHome ? $m->home_score : $m->away_score);
            $conceded = (int) ($isHome ? $m->away_score : $m->home_score);

            $goalsFor += $scored;
            $goalsAgainst += $conceded;

            if ($scored > $conceded) {
                $wins++;
            } elseif ($scored < $conceded) {
                $losses++;
            } else {
                if ($m->winner_team_id) {
                    if ((int) $m->winner_team_id === $teamId) {
                        $wins++;
                    } else {
                        $losses++;
                    }
                } else {
                    $draws++;
                }
            }
        }

        foreach ($friendlyMatches as $fm) {
            $matchesPlayed++;
            $isHost = (int) $fm->host_team_id === $teamId;
            $scored = (int) ($isHost ? $fm->host_score : $fm->opponent_score);
            $conceded = (int) ($isHost ? $fm->opponent_score : $fm->host_score);

            $goalsFor += $scored;
            $goalsAgainst += $conceded;

            if ($scored > $conceded) {
                $wins++;
            } elseif ($scored < $conceded) {
                $losses++;
            } else {
                $draws++;
            }
        }

        $points = ($wins * 3) + ($draws * 1);
        $goalDifference = $goalsFor - $goalsAgainst;

        $team->update([
            'matches_played' => $matchesPlayed,
            'wins' => $wins,
            'draws' => $draws,
            'losses' => $losses,
            'goals_for' => $goalsFor,
            'goals_against' => $goalsAgainst,
            'goal_difference' => $goalDifference,
            'points' => $points,
        ]);

        TeamCache::flushTeam($teamId);
        PublicCache::flushTeamLeaderboard();

        return $team->fresh();
    }

    /**
     * Sync stats for both teams involved in a FootballMatch.
     */
    public function syncForMatch(FootballMatch $match): void
    {
        if ($match->home_team_id) {
            $this->syncTeam((int) $match->home_team_id);
        }

        if ($match->away_team_id) {
            $this->syncTeam((int) $match->away_team_id);
        }
    }

    /**
     * Recalculate stats for all teams in the system.
     */
    public function syncAll(): int
    {
        $teams = Team::all();
        $count = 0;

        foreach ($teams as $team) {
            $this->syncTeam($team);
            $count++;
        }

        PublicCache::flushTeamLeaderboard();

        return $count;
    }
}
