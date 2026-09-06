<?php

namespace App\Domains\Match\Listeners;

use App\Domains\Competition\Models\Competition;
use App\Domains\Competition\Services\StandingsService;
use App\Domains\Match\Events\MatchFinished;
use App\Domains\Match\Notifications\MatchFinishedNotification;
use App\Domains\Match\Services\PlayerPerformanceService;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Support\PublicCache;
use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class MatchFinishedListener implements ShouldQueue
{
    use InteractsWithQueue;

    public function __construct(
        protected PlayerPerformanceService $performances,
    ) {}

    public function handle(MatchFinished $event): void
    {
        $match = $event->match;

        $this->updateTeamRecords($match);
        $this->syncMatchRequest($match);
        $this->performances->syncFromMatch($match);
        $this->updateStandings($match);
        $this->notifyTeams($match);
    }

    protected function syncMatchRequest($match): void
    {
        if (! $match->match_request_id) {
            return;
        }

        $matchRequest = $match->matchRequest()->first();

        if (! $matchRequest) {
            return;
        }

        $matchRequest->update([
            'status' => 'completed',
            'host_score' => $match->home_score,
            'opponent_score' => $match->away_score,
            'score_status' => 'confirmed',
        ]);

        PublicCache::flushTeamLeaderboard();
        PublicCache::flushPlayerLeaderboard();
    }

    protected function updateStandings($match): void
    {
        if (! $match->competition_id) {
            return;
        }

        $competition = Competition::query()->find($match->competition_id);

        if (! $competition) {
            return;
        }

        app(StandingsService::class)
            ->rebuildForCompetition($competition, $match->season_id, $match->group_id);
    }

    protected function updateTeamRecords($match): void
    {
        $teamIds = array_unique([$match->home_team_id, $match->away_team_id]);

        foreach ($teamIds as $teamId) {
            $team = Team::query()->find($teamId);

            if (! $team) {
                continue;
            }

            $team->matches_played = (int) $team->matches_played + 1;
            $team->goals_for = (int) $team->goals_for + $match->scoreFor((int) $teamId);
            $team->goals_against = (int) $team->goals_against + $match->scoreAgainst((int) $teamId);
            $team->goal_difference = (int) $team->goals_for - (int) $team->goals_against;

            match ($match->resultFor((int) $teamId)) {
                'win' => $team->wins = (int) $team->wins + 1,
                'draw' => $team->draws = (int) $team->draws + 1,
                'loss' => $team->losses = (int) $team->losses + 1,
                default => null,
            };

            $team->points = (int) $team->wins * 3 + (int) $team->draws;
            $team->save();

            TeamCache::flushTeam((int) $teamId);
        }
    }

    protected function notifyTeams($match): void
    {
        $teamIds = array_unique([$match->home_team_id, $match->away_team_id]);

        foreach ($teamIds as $teamId) {
            if (! $teamId) {
                continue;
            }

            $userIds = Player::query()
                ->where('team_id', $teamId)
                ->whereNotNull('user_id')
                ->pluck('user_id');

            User::query()
                ->whereIn('id', $userIds)
                ->get()
                ->each(function (User $user) use ($match, $teamId) {
                    $user->notify(new MatchFinishedNotification($match, (int) $teamId));
                });
        }
    }
}
