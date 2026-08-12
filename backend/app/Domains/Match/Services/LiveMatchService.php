<?php

namespace App\Domains\Match\Services;

use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Events\HalfTimeStarted;
use App\Domains\Match\Events\MatchFinished;
use App\Domains\Match\Events\MatchStarted;
use App\Domains\Match\Events\SecondHalfStarted;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Shared\Exceptions\MatchStateException;
use Illuminate\Support\Facades\DB;

class LiveMatchService
{
    public function start(FootballMatch $match, int $byUserId): FootballMatch
    {
        if ($match->status->isLive() || $match->isFinished()) {
            throw new MatchStateException('Match has already started.');
        }

        $wasScheduled = $match->status === MatchStatus::Scheduled
            || $match->status === MatchStatus::Warmup;

        $match->status = MatchStatus::FirstHalf;
        $match->current_period = 'first_half';
        $match->current_minute = $match->current_minute ?: 0;
        $match->started_at ??= now();
        $match->kicked_off_at ??= now();
        $match->save();

        if ($wasScheduled) {
            event(new MatchStarted($match, $byUserId));
        }

        return $match;
    }

    public function pause(FootballMatch $match, int $byUserId): FootballMatch
    {
        $this->assertLive($match);
        $match->status = MatchStatus::Halftime;
        $match->save();
        event(new HalfTimeStarted($match, $byUserId));

        return $match;
    }

    public function resume(FootballMatch $match, int $byUserId): FootballMatch
    {
        $this->assertLive($match);
        $match->status = MatchStatus::SecondHalf;
        $match->current_period = 'second_half';
        $match->save();
        event(new SecondHalfStarted($match, $byUserId));

        return $match;
    }

    public function setMinute(FootballMatch $match, int $minute, int $byUserId): FootballMatch
    {
        $this->assertLive($match);
        $match->current_minute = max(0, min(120, $minute));
        $match->save();

        return $match;
    }

    public function finish(FootballMatch $match, int $byUserId): FootballMatch
    {
        if ($match->isFinished()) {
            return $match;
        }

        $this->assertLive($match);

        DB::transaction(function () use ($match, $byUserId) {
            $match->status = MatchStatus::Finished;
            $match->current_minute = $match->match_duration_minutes ?: 90;
            $match->ended_at = now();
            $match->winner_team_id = $this->determineWinner($match);
            $match->save();

            event(new MatchFinished($match, $byUserId));
        });

        return $match;
    }

    public function cancel(FootballMatch $match, ?string $reason, int $byUserId): FootballMatch
    {
        if ($match->isFinished()) {
            throw new MatchStateException('Finished matches cannot be cancelled.');
        }

        $match->status = MatchStatus::Cancelled;
        $match->ended_at ??= now();
        $match->save();

        return $match;
    }

    public function postpone(FootballMatch $match, ?string $reason, int $byUserId): FootballMatch
    {
        if ($match->isFinished()) {
            throw new MatchStateException('Finished matches cannot be postponed.');
        }

        $match->status = MatchStatus::Postponed;
        $match->save();

        return $match;
    }

    protected function assertLive(FootballMatch $match): void
    {
        if (! $match->status->isLive() || $match->isFinished()) {
            throw new MatchStateException('Match is not live.', 409);
        }
    }

    protected function determineWinner(FootballMatch $match): ?int
    {
        if ($match->home_score > $match->away_score) {
            return $match->home_team_id;
        }

        if ($match->away_score > $match->home_score) {
            return $match->away_team_id;
        }

        return null;
    }
}
