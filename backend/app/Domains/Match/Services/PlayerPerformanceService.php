<?php

namespace App\Domains\Match\Services;

use App\Domains\Match\Events\PlayerAwardedMVP;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\PlayerMatchPerformance;
use App\Domains\Player\Models\PlayerMatchStat;
use App\Domains\Player\Services\PlayerStatisticsService;
use App\Domains\Shared\Support\PlayerCache;
use Illuminate\Support\Facades\DB;

class PlayerPerformanceService
{
    public function __construct(
        protected PlayerStatisticsService $statistics,
    ) {}

    public function upsertPerformance(FootballMatch $match, int $playerId, array $data): PlayerMatchPerformance
    {
        return PlayerMatchPerformance::query()->updateOrCreate(
            ['match_id' => $match->id, 'player_id' => $playerId],
            $data,
        );
    }

    public function awardMvp(FootballMatch $match, int $playerId): PlayerMatchPerformance
    {
        PlayerMatchPerformance::query()
            ->where('match_id', $match->id)
            ->update(['mvp' => false]);

        $performance = $this->upsertPerformance($match, $playerId, ['mvp' => true]);

        event(new PlayerAwardedMVP($match, $performance));

        return $performance;
    }

    public function syncFromMatch(FootballMatch $match): void
    {
        $performances = $match->performances()->with('player:id,user_id')->get();

        if ($performances->isEmpty()) {
            return;
        }

        $userIdMap = $performances->pluck('player.user_id', 'player_id')->filter()->all();

        DB::transaction(function () use ($match, $performances, $userIdMap) {
            foreach ($performances as $performance) {
                $userId = $userIdMap[$performance->player_id] ?? null;

                if (! $userId) {
                    continue;
                }

                $result = $match->resultFor((int) $performance->team_id);

                PlayerMatchStat::query()->updateOrCreate(
                    ['user_id' => $userId, 'match_request_id' => $match->match_request_id],
                    [
                        'team_id' => $performance->team_id,
                        'match_date' => $match->ended_at?->toDateString() ?? $match->started_at?->toDateString() ?? now()->toDateString(),
                        'result' => $this->mapResult($result),
                        'is_tournament' => $match->competition_id !== null,
                        'started' => $performance->minutes_played > 0,
                        'played' => true,
                        'minutes' => $performance->minutes_played,
                        'goals' => $performance->goals,
                        'assists' => $performance->assists,
                        'own_goals' => $performance->own_goals,
                        'yellow_cards' => $performance->yellow_cards,
                        'red_cards' => $performance->red_cards,
                        'rating' => $performance->rating,
                        'mvp' => $performance->mvp,
                        'clean_sheet' => $performance->clean_sheet,
                    ],
                );

                $this->statistics->syncForUser((int) $userId);
            }

            $teamIds = array_filter([$match->home_team_id, $match->away_team_id]);
            foreach ($teamIds as $teamId) {
                PlayerCache::flush((int) $teamId);
            }
        });
    }

    protected function mapResult(?string $result): ?string
    {
        return match ($result) {
            'win' => PlayerMatchStat::RESULT_WIN,
            'draw' => PlayerMatchStat::RESULT_DRAW,
            'loss' => PlayerMatchStat::RESULT_LOSS,
            default => null,
        };
    }
}
