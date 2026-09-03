<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchEventType;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchEvent;
use App\Domains\Match\Models\PenaltyAward;
use App\Domains\Match\Models\PlayerPenalty;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Configurable foul / fault penalty engine.
 *
 * Fouls are recorded as ordinary `foul` match events (the source of truth).
 * Foul counts are always recomputed from those events inside the configured
 * reset-scope window (per half or whole match). Threshold crossings surface as
 * confirmable suggestions; the committee decides whether to apply a time
 * penalty or award a penalty shot. Nothing is auto-applied.
 */
class TournamentFoulRuleService
{
    /**
     * Whether any foul rule is enabled and configured for the tournament.
     */
    public function active(Tournament $tournament): bool
    {
        if (! $tournament->foulRulesEnabled()) {
            return false;
        }

        return $tournament->playerFoulRuleConfigured() || $tournament->teamFoulRuleConfigured();
    }

    /**
     * All `foul` events for the match, ordered chronologically.
     */
    protected function foulEvents(FootballMatch $match): Collection
    {
        return MatchEvent::query()
            ->where('match_id', $match->id)
            ->where('type', MatchEventType::Foul->value)
            ->with(['team', 'player'])
            ->orderBy('half')
            ->orderBy('minute')
            ->orderBy('added_time')
            ->orderBy('id')
            ->get();
    }

    /**
     * The window key a foul belongs to, respecting the reset scope.
     */
    protected function windowKey(Tournament $tournament, string $half): string
    {
        return $tournament->foulsResetPerHalf() ? $half : 'match';
    }

    /**
     * Build the full foul-penalty status payload for the committee modal.
     */
    public function status(Fixture $fixture, Tournament $tournament): array
    {
        $match = $fixture->match;

        if (! $match) {
            return $this->emptyState();
        }

        $this->reconcile($tournament, $match);

        $fouls = $this->foulEvents($match);

        return [
            'enabled' => $this->active($tournament),
            'settings' => $this->settings($tournament),
            'teams' => $this->teamCounters($tournament, $fouls),
            'players' => $this->playerCounters($tournament, $fouls),
            'active_penalties' => $this->activePenaltiesPayload($match),
            'pending_awards' => $this->pendingAwardsPayload($match),
            'suggestions' => $this->suggestions($tournament, $fouls, $match),
        ];
    }

    protected function emptyState(): array
    {
        return [
            'enabled' => false,
            'settings' => $this->settings(null),
            'teams' => [],
            'players' => [],
            'active_penalties' => [],
            'pending_awards' => [],
            'suggestions' => [],
        ];
    }

    /**
     * The rule settings as exposed to the committee UI.
     */
    public function settings(?Tournament $tournament): array
    {
        if (! $tournament) {
            return [
                'player_threshold' => null,
                'player_minutes' => null,
                'player_repeat' => true,
                'team_threshold' => null,
                'team_repeat' => true,
                'reset_scope' => 'half',
            ];
        }

        return [
            'player_threshold' => $tournament->playerFoulThreshold(),
            'player_minutes' => $tournament->playerPenaltyMinutes(),
            'player_repeat' => $tournament->playerFoulRepeat(),
            'team_threshold' => $tournament->teamFoulThreshold(),
            'team_repeat' => $tournament->teamFoulRepeat(),
            'reset_scope' => $tournament->foulResetScope(),
        ];
    }

    /**
     * Per-team foul counters in the currently relevant window(s).
     *
     * @param  \Illuminate\Support\Collection<int, MatchEvent>  $fouls
     * @return array<int, array<string, mixed>>
     */
    protected function teamCounters(Tournament $tournament, Collection $fouls): array
    {
        $counts = [];

        foreach ($fouls->groupBy('team_id') as $teamId => $teamFouls) {
            foreach ($teamFouls->groupBy(fn (MatchEvent $e) => $this->windowKey($tournament, (string) ($e->half ?? 'first'))) as $window => $windowFouls) {
                $team = $teamFouls->first()->team;
                $count = $windowFouls->count();
                $counts[] = [
                    'team_id' => (int) $teamId,
                    'team_name' => $team?->name,
                    'window' => $window,
                    'count' => $count,
                    'threshold' => $tournament->teamFoulThreshold(),
                    'repeat' => $tournament->teamFoulRepeat(),
                ];
            }
        }

        return $counts;
    }

    /**
     * Per-player foul counters.
     *
     * @param  \Illuminate\Support\Collection<int, MatchEvent>  $fouls
     * @return array<int, array<string, mixed>>
     */
    protected function playerCounters(Tournament $tournament, Collection $fouls): array
    {
        $counts = [];

        foreach ($fouls->groupBy('player_id') as $playerId => $playerFouls) {
            foreach ($playerFouls->groupBy(fn (MatchEvent $e) => $this->windowKey($tournament, (string) ($e->half ?? 'first'))) as $window => $windowFouls) {
                $foul = $windowFouls->last();
                $counts[] = [
                    'player_id' => (int) $playerId,
                    'player_name' => $foul->player?->name,
                    'team_id' => (int) ($foul->team_id ?? 0),
                    'window' => $window,
                    'count' => $windowFouls->count(),
                    'threshold' => $tournament->playerFoulThreshold(),
                    'repeat' => $tournament->playerFoulRepeat(),
                ];
            }
        }

        return $counts;
    }

    /**
     * Active (or queued, active-but-pending) time penalties for the match.
     */
    public function activePenaltiesPayload(FootballMatch $match): array
    {
        return PlayerPenalty::query()
            ->where('match_id', $match->id)
            ->where('status', PlayerPenalty::STATUS_ACTIVE)
            ->with(['player', 'team'])
            ->orderBy('id')
            ->get()
            ->map(fn (PlayerPenalty $p) => [
                'id' => $p->id,
                'player' => $p->player ? [
                    'id' => $p->player->id,
                    'name' => $p->player->name,
                    'number' => $p->player->number,
                ] : null,
                'team_id' => $p->team_id,
                'half' => $p->half,
                'start_minute' => $p->start_minute,
                'duration_minutes' => $p->duration_minutes,
                'end_minute' => $p->end_minute,
            ])
            ->values()
            ->all();
    }

    /**
     * Awards that are still awaiting an outcome.
     */
    public function pendingAwardsPayload(FootballMatch $match): array
    {
        return PenaltyAward::query()
            ->where('match_id', $match->id)
            ->where('status', PenaltyAward::STATUS_AWARDED)
            ->with(['awardedToTeam', 'committingTeam'])
            ->orderBy('id')
            ->get()
            ->map(fn (PenaltyAward $a) => [
                'id' => $a->id,
                'awarded_to_team_id' => $a->awarded_to_team_id,
                'awarded_to_name' => $a->awardedToTeam?->name,
                'committing_team_id' => $a->committing_team_id,
                'committing_name' => $a->committingTeam?->name,
                'triggering_foul_count' => $a->triggering_foul_count,
                'half' => $a->half,
                'minute' => $a->minute,
            ])
            ->values()
            ->all();
    }

    /**
     * Compute current confirmable suggestions from the foul events. A suggestion
     * fires whenever a threshold multiple has been crossed within a window and
     * no record (confirmed or dismissed) has consumed that batch yet.
     *
     * @param  \Illuminate\Support\Collection<int, MatchEvent>  $fouls
     * @return array<int, array<string, mixed>>
     */
    public function suggestions(Tournament $tournament, Collection $fouls, FootballMatch $match): array
    {
        if (! $this->active($tournament)) {
            return [];
        }

        $suggestions = [];

        if ($tournament->playerFoulRuleConfigured()) {
            $suggestions = array_merge($suggestions, $this->playerSuggestions($tournament, $fouls, $match));
        }

        if ($tournament->teamFoulRuleConfigured()) {
            $suggestions = array_merge($suggestions, $this->teamSuggestions($tournament, $fouls, $match));
        }

        return $suggestions;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, MatchEvent>  $fouls
     * @return array<int, array<string, mixed>>
     */
    protected function playerSuggestions(Tournament $tournament, Collection $fouls, FootballMatch $match): array
    {
        $threshold = $tournament->playerFoulThreshold();
        $repeat = $tournament->playerFoulRepeat();
        $out = [];

        $confirmed = PlayerPenalty::query()
            ->where('match_id', $match->id)
            ->whereIn('status', [PlayerPenalty::STATUS_ACTIVE, PlayerPenalty::STATUS_EXPIRED, PlayerPenalty::STATUS_ENDED_EARLY, PlayerPenalty::STATUS_DISMISSED])
            ->get();

        foreach ($fouls->groupBy('player_id') as $playerId => $playerFouls) {
            foreach ($playerFouls->groupBy(fn (MatchEvent $e) => $this->windowKey($tournament, (string) ($e->half ?? 'first'))) as $window => $windowFouls) {
                $count = $windowFouls->count();
                $resolvedBatches = $confirmed
                    ->filter(fn (PlayerPenalty $p) => (int) $p->player_id === (int) $playerId && ($key = $this->windowKey($tournament, (string) ($p->half ?? 'first'))) === $window)
                    ->count();

                $pendingBatches = $repeat
                    ? (int) floor($count / $threshold)
                    : ($count >= $threshold ? 1 : 0);

                if ($pendingBatches > $resolvedBatches) {
                    $batch = $resolvedBatches + 1;
                    $foul = $windowFouls->get($batch * $threshold - 1) ?? $windowFouls->last();

                    $out[] = [
                        'type' => 'player_penalty',
                        'player_id' => (int) $playerId,
                        'player_name' => $foul?->player?->name,
                        'team_id' => (int) ($foul?->team_id ?? 0),
                        'window' => $window,
                        'half' => $window === 'match' ? ($foul?->half ?? 'first') : $window,
                        'count' => $count,
                        'threshold' => $threshold,
                        'batch' => $batch,
                        'minutes' => $tournament->playerPenaltyMinutes(),
                        'event_id' => $foul?->id,
                        'minute' => $foul?->minute ?? 0,
                    ];
                }
            }
        }

        return $out;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, MatchEvent>  $fouls
     * @return array<int, array<string, mixed>>
     */
    protected function teamSuggestions(Tournament $tournament, Collection $fouls, FootballMatch $match): array
    {
        $threshold = $tournament->teamFoulThreshold();
        $repeat = $tournament->teamFoulRepeat();
        $out = [];

        $resolved = PenaltyAward::query()
            ->where('match_id', $match->id)
            ->whereIn('status', array_merge(PenaltyAward::OUTCOME_STATUSES, [PenaltyAward::STATUS_VOIDED, PenaltyAward::STATUS_DISMISSED]))
            ->get();

        foreach ($fouls->groupBy('team_id') as $teamId => $teamFouls) {
            foreach ($teamFouls->groupBy(fn (MatchEvent $e) => $this->windowKey($tournament, (string) ($e->half ?? 'first'))) as $window => $windowFouls) {
                $count = $windowFouls->count();
                $resolvedBatches = $resolved
                    ->filter(fn (PenaltyAward $a) => (int) $a->committing_team_id === (int) $teamId && $this->windowKey($tournament, (string) ($a->half ?? 'first')) === $window)
                    ->count();

                $pendingBatches = $repeat
                    ? (int) floor($count / $threshold)
                    : ($count >= $threshold ? 1 : 0);

                if ($pendingBatches > $resolvedBatches) {
                    $batch = $resolvedBatches + 1;
                    $foul = $windowFouls->get($batch * $threshold - 1) ?? $windowFouls->last();
                    $committing = $teamFouls->first()->team;
                    $opponentId = $this->opponentFor($match, (int) $teamId);

                    $out[] = [
                        'type' => 'team_penalty',
                        'committing_team_id' => (int) $teamId,
                        'committing_team_name' => $committing?->name,
                        'awarded_to_team_id' => $opponentId,
                        'awarded_to_team_name' => $opponentId ? Team::query()->find($opponentId)?->name : null,
                        'window' => $window,
                        'half' => $window === 'match' ? ($foul?->half ?? 'first') : $window,
                        'count' => $count,
                        'threshold' => $threshold,
                        'batch' => $batch,
                        'event_id' => $foul?->id,
                        'minute' => $foul?->minute ?? 0,
                    ];
                }
            }
        }

        return $out;
    }

    protected function opponentFor(FootballMatch $match, int $teamId): ?int
    {
        if ((int) $match->home_team_id === $teamId) {
            return $match->away_team_id ? (int) $match->away_team_id : null;
        }

        if ((int) $match->away_team_id === $teamId) {
            return $match->home_team_id ? (int) $match->home_team_id : null;
        }

        return null;
    }

    /**
     * Confirm a player time-penalty suggestion. New penalties queue behind any
     * already-active penalty for the same player (no overlap).
     */
    public function applyPlayerPenalty(Tournament $tournament, FootballMatch $match, int $eventId, bool $confirm): PlayerPenalty
    {
        $event = MatchEvent::query()->find($eventId);

        if (! $event || (int) $event->match_id !== (int) $match->id) {
            throw new DomainException('حدث التقرير غير صالح');
        }

        if (! $tournament->playerFoulRuleConfigured()) {
            throw new DomainException('قاعدة عقوبة اللاعب غير مفعلة');
        }

        $playerId = (int) $event->player_id;
        $half = $event->half ?: 'first';
        $duration = $tournament->playerPenaltyMinutes();

        return DB::transaction(function () use ($match, $event, $playerId, $half, $duration, $confirm) {
            // Find the latest record for this player in the same window to queue behind.
            $last = PlayerPenalty::query()
                ->where('match_id', $match->id)
                ->where('player_id', $playerId)
                ->where('half', $half)
                ->where('status', PlayerPenalty::STATUS_ACTIVE)
                ->orderByDesc('id')
                ->first();

            $start = $last ? (int) $last->end_minute : (int) $event->minute;
            $end = $start + $duration;

            if (! $confirm) {
                return PlayerPenalty::query()->create([
                    'match_id' => $match->id,
                    'player_id' => $playerId,
                    'team_id' => $event->team_id,
                    'half' => $half,
                    'start_minute' => $start,
                    'duration_minutes' => $duration,
                    'end_minute' => $end,
                    'status' => PlayerPenalty::STATUS_DISMISSED,
                    'triggered_by_event_id' => $event->id,
                ]);
            }

            return PlayerPenalty::query()->create([
                'match_id' => $match->id,
                'player_id' => $playerId,
                'team_id' => $event->team_id,
                'half' => $half,
                'start_minute' => $start,
                'duration_minutes' => $duration,
                'end_minute' => $end,
                'status' => PlayerPenalty::STATUS_ACTIVE,
                'triggered_by_event_id' => $event->id,
            ]);
        });
    }

    /**
     * Confirm a team penalty-shot award suggestion (awarded to the opponent).
     */
    public function applyPenaltyAward(Tournament $tournament, FootballMatch $match, int $eventId, bool $confirm): PenaltyAward
    {
        $event = MatchEvent::query()->find($eventId);

        if (! $event || (int) $event->match_id !== (int) $match->id) {
            throw new DomainException('حدث التقرير غير صالح');
        }

        if (! $tournament->teamFoulRuleConfigured()) {
            throw new DomainException('قاعدة ركلة الجزاء غير مفعلة');
        }

        $committingTeamId = (int) $event->team_id;
        $awardedToTeamId = $this->opponentFor($match, $committingTeamId);
        $half = $event->half ?: 'first';
        $count = $this->teamFoulCountUpTo($match, $committingTeamId, $half, $event->id, $tournament);

        if (! $awardedToTeamId) {
            throw new DomainException('لا يمكن تحديد الفريق المقابل');
        }

        $status = $confirm ? PenaltyAward::STATUS_AWARDED : PenaltyAward::STATUS_DISMISSED;

        return PenaltyAward::query()->create([
            'match_id' => $match->id,
            'awarded_to_team_id' => $awardedToTeamId,
            'committing_team_id' => $committingTeamId,
            'triggering_foul_count' => $count,
            'half' => $half,
            'minute' => $event->minute,
            'status' => $status,
            'triggered_by_event_id' => $event->id,
        ]);
    }

    protected function teamFoulCountUpTo(FootballMatch $match, int $teamId, string $half, int $eventId, Tournament $tournament): int
    {
        $scope = $tournament->foulsResetPerHalf() ? 'half' : 'match';

        return MatchEvent::query()
            ->where('match_id', $match->id)
            ->where('team_id', $teamId)
            ->where('type', MatchEventType::Foul->value)
            ->where('id', '<=', $eventId)
            ->when($scope === 'half', fn ($q) => $q->where('half', $half))
            ->count();
    }

    /**
     * Manually end an active penalty early (real-world early termination).
     */
    public function endPlayerPenalty(FootballMatch $match, PlayerPenalty $penalty): PlayerPenalty
    {
        if ((int) $penalty->match_id !== (int) $match->id) {
            throw new DomainException('العقوبة لا تنتمي إلى هذه المباراة', 404);
        }

        if (! $penalty->isActive()) {
            throw new DomainException('العقوبة غير نشطة');
        }

        $penalty->forceFill(['status' => PlayerPenalty::STATUS_ENDED_EARLY])->save();

        return $penalty;
    }

    /**
     * Record the outcome of a pending penalty-shot award. When an outcome event
     * id is provided its type decides converted vs missed; otherwise the caller
     * may pass an explicit resolution.
     */
    public function resolveAward(FootballMatch $match, PenaltyAward $award, ?int $outcomeEventId = null, ?string $outcome = null): PenaltyAward
    {
        if ((int) $award->match_id !== (int) $match->id) {
            throw new DomainException('الركلة لا تنتمي إلى هذه المباراة', 404);
        }

        if (! $award->isPending()) {
            throw new DomainException('معلومة تنفيذ الركلة مسجلة بالفعل');
        }

        $event = null;
        $status = null;

        if ($outcomeEventId) {
            $event = MatchEvent::query()->find($outcomeEventId);

            if (! $event || (int) $event->match_id !== (int) $match->id) {
                throw new DomainException('حدث النتيجة غير صالح');
            }

            $status = match ($event->type) {
                MatchEventType::PenaltyGoal => PenaltyAward::STATUS_CONVERTED,
                MatchEventType::MissedPenalty => PenaltyAward::STATUS_MISSED,
                default => PenaltyAward::STATUS_VOIDED,
            };
        } else {
            $status = match ($outcome) {
                'converted' => PenaltyAward::STATUS_CONVERTED,
                'missed' => PenaltyAward::STATUS_MISSED,
                'saved' => PenaltyAward::STATUS_SAVED,
                default => throw new DomainException('نتيجة الركلة غير صالحة'),
            };
        }

        $award->forceFill([
            'status' => $status,
            'outcome_event_id' => $event?->id ?? $award->outcome_event_id,
        ])->save();

        return $award;
    }

    /**
     * Reconcile stored penalty records against the current set of foul events
     * and the match clock. Called after events are replaced/deleted and on every
     * status read so the UI never shows stale or dangling records.
     */
    public function reconcile(Tournament $tournament, FootballMatch $match): void
    {
        if (! $this->active($tournament)) {
            // Rules disabled: clean up any residual active state.
            $this->closeActiveState($match);

            return;
        }

        $validEventIds = MatchEvent::query()
            ->where('match_id', $match->id)
            ->where('type', MatchEventType::Foul->value)
            ->pluck('id')
            ->all();

        PlayerPenalty::query()
            ->where('match_id', $match->id)
            ->whereNotNull('triggered_by_event_id')
            ->whereNotIn('triggered_by_event_id', $validEventIds)
            ->delete();

        PenaltyAward::query()
            ->where('match_id', $match->id)
            ->whereNotNull('triggered_by_event_id')
            ->whereNotIn('triggered_by_event_id', $validEventIds)
            ->delete();

        if ($match->isFinished() || $match->status === MatchStatus::Cancelled) {
            $this->closeActiveState($match);

            return;
        }

        $this->expirePenaltiesByClock($tournament, $match);
    }

    protected function closeActiveState(FootballMatch $match): void
    {
        PlayerPenalty::query()
            ->where('match_id', $match->id)
            ->where('status', PlayerPenalty::STATUS_ACTIVE)
            ->update(['status' => PlayerPenalty::STATUS_EXPIRED]);
    }

    protected function expirePenaltiesByClock(Tournament $tournament, FootballMatch $match): void
    {
        $active = PlayerPenalty::query()
            ->where('match_id', $match->id)
            ->where('status', PlayerPenalty::STATUS_ACTIVE)
            ->get();

        foreach ($active as $penalty) {
            $current = $this->currentRelativeMinute($match, (string) $penalty->half, $tournament);

            if ($current === null || (int) $current >= (int) $penalty->end_minute || ! $this->halfStillRunning($match, (string) $penalty->half)) {
                $penalty->forceFill(['status' => PlayerPenalty::STATUS_EXPIRED])->save();
            }
        }
    }

    /**
     * Current running minute of a given half, derived from the live clock the
     * same way the frontend does. Returns null when the half is not running.
     */
    public function currentRelativeMinute(FootballMatch $match, string $half, Tournament $tournament): ?int
    {
        $status = $match->status;

        if (! $status instanceof MatchStatus) {
            return null;
        }

        if (! $status->isLive() && ! $status->isHalftime()) {
            return null;
        }

        $running = $half === 'second'
            ? $status === MatchStatus::SecondHalf
            : $status === MatchStatus::FirstHalf;

        if (! $running) {
            return null;
        }

        $start = $half === 'second'
            ? $match->second_half_started_at
            : $match->kicked_off_at;

        if (! $start) {
            return null;
        }

        $elapsed = (int) max(0, floor((now()->getTimestamp() - $start->getTimestamp()) / 60));

        $max = $tournament->halfDurationMinutes() + $tournament->extraMinutesForHalf($half);

        return min($max, $elapsed + 1);
    }

    protected function halfStillRunning(FootballMatch $match, string $half): bool
    {
        $status = $match->status;

        if (! $status instanceof MatchStatus) {
            return false;
        }

        return $half === 'second'
            ? $status === MatchStatus::SecondHalf
            : $status === MatchStatus::FirstHalf;
    }
}