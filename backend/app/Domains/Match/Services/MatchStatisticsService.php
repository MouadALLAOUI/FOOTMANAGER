<?php

namespace App\Domains\Match\Services;

use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchStatistic;
use App\Domains\Shared\Exceptions\DomainException;

class MatchStatisticsService
{
    public function upsert(FootballMatch $match, int $teamId, array $data): MatchStatistic
    {
        return MatchStatistic::query()->updateOrCreate(
            ['match_id' => $match->id, 'team_id' => $teamId],
            $data,
        );
    }

    public function increment(FootballMatch $match, ?int $teamId, string $column, int $by = 1): void
    {
        if (! $teamId) {
            throw new DomainException('team_id is required.');
        }

        $this->ensureColumn($column);

        $statistic = MatchStatistic::query()->firstOrCreate(
            ['match_id' => $match->id, 'team_id' => $teamId],
        );

        $statistic->increment($column, $by);
    }

    public function setPossession(FootballMatch $match): void
    {
        $home = MatchStatistic::query()->where('match_id', $match->id)
            ->where('team_id', $match->home_team_id)->first();
        $away = MatchStatistic::query()->where('match_id', $match->id)
            ->where('team_id', $match->away_team_id)->first();

        if (! $home || ! $away) {
            return;
        }

        $total = $home->possession + $away->possession;

        if ($total <= 0) {
            $home->possession = 50;
            $away->possession = 50;
        } else {
            $home->possession = round(($home->possession / $total) * 100);
            $away->possession = 100 - $home->possession;
        }

        $home->save();
        $away->save();
    }

    public function forMatch(int $matchId): array
    {
        return MatchStatistic::query()
            ->where('match_id', $matchId)
            ->with('team')
            ->get()
            ->all();
    }

    public function reset(FootballMatch $match): void
    {
        MatchStatistic::query()->where('match_id', $match->id)->delete();
    }

    protected function ensureColumn(string $column): void
    {
        $allowed = [
            'possession', 'shots', 'shots_on_target', 'corners', 'fouls',
            'yellow_cards', 'red_cards', 'offsides', 'saves', 'passes',
        ];

        if (! in_array($column, $allowed, true)) {
            throw new DomainException("Unsupported statistic column: {$column}.");
        }
    }
}
