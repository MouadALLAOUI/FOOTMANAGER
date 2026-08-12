<?php

namespace App\Domains\Social\Observers;

use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Social\Models\Activity;
use App\Domains\Social\Services\ActivityService;

class FootballMatchObserver
{
    public function __construct(protected ActivityService $activity) {}

    public function created(FootballMatch $match): void
    {
        $this->activity->record(
            Activity::TYPE_MATCH_CREATED,
            $match->createdBy,
            $match,
            [
                'home_team_id' => $match->home_team_id,
                'away_team_id' => $match->away_team_id,
            ],
        );
    }

    public function updated(FootballMatch $match): void
    {
        if (! $match->wasChanged('status')) {
            return;
        }

        if ($match->status === MatchStatus::Finished) {
            $winner = $match->winnerTeam;

            $this->activity->record(
                Activity::TYPE_MATCH_FINISHED,
                $winner?->manager,
                $match,
                [
                    'home_team_id' => $match->home_team_id,
                    'away_team_id' => $match->away_team_id,
                    'home_score' => $match->home_score,
                    'away_score' => $match->away_score,
                    'winner_team_id' => $match->winner_team_id,
                ],
            );

            if ($winner) {
                $this->activity->record(
                    Activity::TYPE_TEAM_WON,
                    $winner->manager,
                    $winner,
                    ['name' => $winner->name],
                    $winner->logo_url,
                );
            }
        }
    }
}
