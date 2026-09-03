<?php

namespace App\Domains\Match\Services;

use App\Domains\Match\Enums\MatchEventType;
use App\Domains\Match\Enums\MatchPunishment;
use App\Domains\Match\Events\CardGiven;
use App\Domains\Match\Events\GoalScored;
use App\Domains\Match\Events\SubstitutionMade;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchEvent;
use App\Domains\Match\Repositories\MatchEventRepository;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Shared\Exceptions\MatchStateException;
use Illuminate\Support\Facades\DB;

class MatchEventService
{
    public function __construct(
        protected MatchEventRepository $events,
    ) {}

    public function record(FootballMatch $match, array $data, int $byUserId): MatchEvent
    {
        if ($match->isFinished()) {
            throw new MatchStateException('Cannot record events on a finished match.', 409);
        }

        if (! $match->status->isLive()) {
            throw new MatchStateException('Match has not started. Cannot record events.', 409);
        }

        $type = MatchEventType::from($data['type']);

        return DB::transaction(function () use ($match, $data, $type, $byUserId) {
            $event = $this->events->create($match->id, [
                'type' => $type->value,
                'punishment' => isset($data['punishment']) ? (string) $data['punishment'] : null,
                'team_id' => $data['team_id'] ?? null,
                'player_id' => $data['player_id'] ?? null,
                'assist_player_id' => $data['assist_player_id'] ?? null,
                'minute' => (int) ($data['minute'] ?? $match->current_minute ?? 0),
                'added_time' => (int) ($data['added_time'] ?? $match->added_time ?? 0),
                'period' => $data['period'] ?? $match->current_period,
                'description' => $data['description'] ?? null,
                'icon' => $data['icon'] ?? $type->icon(),
                'created_by' => $byUserId,
            ]);

            if ($type->affectsScore()) {
                $this->applyScore($match, $event, $data['team_id']);
            }

            $this->updateStatistic($match, $event);

            if ($type === MatchEventType::Goal || $type === MatchEventType::PenaltyGoal) {
                event(new GoalScored($match, $event));
            }

            if ($type === MatchEventType::Foul
                && $data['punishment'] !== null
                && $data['punishment'] !== MatchPunishment::None->value) {
                event(new CardGiven($match, $event));
            }

            if ($type === MatchEventType::Substitution) {
                event(new SubstitutionMade($match, $event));
            }

            return $event->load(['team', 'player', 'assistPlayer']);
        });
    }

    public function update(MatchEvent $event, array $data, int $byUserId): MatchEvent
    {
        $match = $event->match;

        if ($match->isFinished()) {
            throw new MatchStateException('Cannot update events on a finished match.', 409);
        }

        if (! $match->status->isLive()) {
            throw new MatchStateException('Match has not started. Cannot update events.', 409);
        }

        return DB::transaction(function () use ($event, $data, $match) {
            $oldType = $event->type;

            $event = $this->events->update($event, [
                'type' => $data['type'] ?? $event->type->value,
                'punishment' => array_key_exists('punishment', $data) ? (string) $data['punishment'] : $event->punishment,
                'team_id' => $data['team_id'] ?? $event->team_id,
                'player_id' => $data['player_id'] ?? $event->player_id,
                'assist_player_id' => array_key_exists('assist_player_id', $data) ? $data['assist_player_id'] : $event->assist_player_id,
                'minute' => (int) ($data['minute'] ?? $event->minute),
                'added_time' => (int) ($data['added_time'] ?? $event->added_time),
                'period' => $data['period'] ?? $event->period,
                'description' => array_key_exists('description', $data) ? $data['description'] : $event->description,
                'icon' => $data['icon'] ?? $event->icon,
            ]);

            $newType = $event->type;

            if ($oldType->affectsScore() !== $newType->affectsScore()) {
                $this->recalculateScore($match);
            } elseif ($newType->affectsScore()) {
                $this->recalculateScore($match);
            }

            return $event->load(['team', 'player', 'assistPlayer']);
        });
    }

    public function delete(MatchEvent $event, int $byUserId): void
    {
        $match = $event->match;

        if ($match->isFinished()) {
            throw new MatchStateException('Cannot delete events on a finished match.', 409);
        }

        if (! $match->status->isLive()) {
            throw new MatchStateException('Match has not started. Cannot delete events.', 409);
        }

        DB::transaction(function () use ($event, $match) {
            $this->events->delete($event);
            $this->recalculateScore($match);
        });
    }

    protected function applyScore(FootballMatch $match, MatchEvent $event, ?int $teamId): void
    {
        if (! $teamId) {
            throw new DomainException('team_id is required for scoring events.');
        }

        if ((int) $teamId === (int) $match->home_team_id) {
            if ($event->type === MatchEventType::OwnGoal) {
                $match->away_score++;
            } else {
                $match->home_score++;
            }
        } elseif ((int) $teamId === (int) $match->away_team_id) {
            if ($event->type === MatchEventType::OwnGoal) {
                $match->home_score++;
            } else {
                $match->away_score++;
            }
        } else {
            throw new DomainException('team_id does not belong to this match.');
        }

        $match->save();
    }

    protected function recalculateScore(FootballMatch $match): void
    {
        $events = $match->events()->get();

        $homeScore = $events->filter(function (MatchEvent $event) use ($match) {
            if (! in_array($event->type, [MatchEventType::Goal, MatchEventType::PenaltyGoal, MatchEventType::OwnGoal], true)) {
                return false;
            }

            if ($event->type === MatchEventType::OwnGoal) {
                return (int) $event->team_id === (int) $match->away_team_id;
            }

            return (int) $event->team_id === (int) $match->home_team_id;
        })->count();

        $awayScore = $events->filter(function (MatchEvent $event) use ($match) {
            if (! in_array($event->type, [MatchEventType::Goal, MatchEventType::PenaltyGoal, MatchEventType::OwnGoal], true)) {
                return false;
            }

            if ($event->type === MatchEventType::OwnGoal) {
                return (int) $event->team_id === (int) $match->home_team_id;
            }

            return (int) $event->team_id === (int) $match->away_team_id;
        })->count();

        $match->home_score = $homeScore;
        $match->away_score = $awayScore;
        $match->save();
    }

    protected function updateStatistic(FootballMatch $match, MatchEvent $event): void
    {
        $statistics = app(MatchStatisticsService::class);

        match ($event->type) {
            MatchEventType::YellowCard => $statistics->increment($match, $event->team_id, 'yellow_cards'),
            MatchEventType::SecondYellow,
            MatchEventType::RedCard => $statistics->increment($match, $event->team_id, 'red_cards'),
            MatchEventType::Foul => $this->updateFoulStatistic($statistics, $match, $event),
            MatchEventType::Goal,
            MatchEventType::PenaltyGoal,
            MatchEventType::OwnGoal => $statistics->increment($match, $event->team_id, 'shots_on_target'),
            default => null,
        };
    }

    /**
     * For the merged `foul` entry point, cards are counted from the
     * punishment value (dismissals => red, everything else => yellow).
     */
    private function updateFoulStatistic(MatchStatisticsService $statistics, FootballMatch $match, MatchEvent $event): void
    {
        $punishment = $event->punishment;

        if ($punishment === null || $punishment === MatchPunishment::None) {
            return;
        }

        if ($punishment->isDismissal() || $punishment === MatchPunishment::Red) {
            $statistics->increment($match, $event->team_id, 'red_cards');

            return;
        }

        $statistics->increment($match, $event->team_id, 'yellow_cards');
    }
}
