<?php

namespace App\Domains\Team\Services;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Models\Attendance;
use App\Domains\Team\Models\Team;
use App\Domains\Team\Models\TeamMatchPlayer;
use Illuminate\Support\Facades\Cache;

class TeamStatisticsService
{
    public function for(Team $team): array
    {
        $ttl = (int) config('team.cache.statistics_ttl');

        return Cache::remember(TeamCache::statistics($team->id), $ttl, function () use ($team) {
            $matches = $this->completedMatches($team);
            $recordedAttendance = $this->averageAttendance($team);
            $topPerformers = $this->topPerformers($team);

            $matchesPlayed = max(0, (int) $team->matches_played);
            $wins = max(0, (int) $team->wins);
            $draws = max(0, (int) $team->draws);
            $losses = max(0, (int) $team->losses);
            $goalsFor = max(0, (int) $team->goals_for);
            $goalsAgainst = max(0, (int) $team->goals_against);

            return [
                'matches_played' => $matchesPlayed,
                'wins' => $wins,
                'draws' => $draws,
                'losses' => $losses,
                'goals_for' => $goalsFor,
                'goals_against' => $goalsAgainst,
                'goal_difference' => $goalsFor - $goalsAgainst,
                'points' => max(0, (int) $team->points),
                'win_rate' => $matchesPlayed > 0 ? round(($wins / $matchesPlayed) * 100, 1) : 0,
                'average_goals' => $matchesPlayed > 0 ? round($goalsFor / $matchesPlayed, 2) : 0,
                'average_goals_conceded' => $matchesPlayed > 0 ? round($goalsAgainst / $matchesPlayed, 2) : 0,
                'current_streak' => $this->currentStreak($matches),
                'longest_winning_streak' => $this->longestWinningStreak($matches),
                'biggest_win' => $this->biggestWin($matches),
                'biggest_loss' => $this->biggestLoss($matches),
                'clean_sheets' => $this->cleanSheets($matches),
                'average_attendance' => $recordedAttendance,
                'most_active_player' => $topPerformers['most_active'],
                'top_scorer' => $topPerformers['top_scorer'],
                'top_assist_provider' => $topPerformers['top_assist'],
                'most_valuable_player' => $topPerformers['most_valuable'],
            ];
        });
    }

    /**
     * @return array<int, array{date: string, score_for: int, score_against: int, result: string}>
     */
    private function completedMatches(Team $team): array
    {
        return MatchRequest::query()
            ->where('status', 'completed')
            ->where(function ($q) use ($team) {
                $q->where('host_team_id', $team->id)->orWhere('opponent_team_id', $team->id);
            })
            ->orderBy('match_datetime', 'asc')
            ->get(['id', 'host_team_id', 'opponent_team_id', 'host_score', 'opponent_score', 'match_datetime'])
            ->map(function (MatchRequest $match) use ($team) {
                if ((int) $match->host_team_id === (int) $team->id) {
                    $scoreFor = (int) $match->host_score;
                    $scoreAgainst = (int) $match->opponent_score;
                } else {
                    $scoreFor = (int) $match->opponent_score;
                    $scoreAgainst = (int) $match->host_score;
                }

                return [
                    'date' => $match->match_datetime?->toDateString() ?? '',
                    'score_for' => $scoreFor,
                    'score_against' => $scoreAgainst,
                    'result' => $scoreFor > $scoreAgainst ? 'win' : ($scoreFor < $scoreAgainst ? 'loss' : 'draw'),
                ];
            })
            ->all();
    }

    private function currentStreak(array $matches): ?array
    {
        if (empty($matches)) {
            return null;
        }

        $reversed = array_reverse($matches);
        $result = $reversed[0]['result'];
        $count = 0;

        foreach ($reversed as $match) {
            if ($match['result'] !== $result) {
                break;
            }
            $count++;
        }

        return ['type' => $result, 'count' => $count];
    }

    private function longestWinningStreak(array $matches): int
    {
        $longest = 0;
        $current = 0;

        foreach ($matches as $match) {
            $current = $match['result'] === 'win' ? $current + 1 : 0;
            $longest = max($longest, $current);
        }

        return $longest;
    }

    private function biggestWin(array $matches): ?int
    {
        $biggest = null;

        foreach ($matches as $match) {
            $margin = $match['score_for'] - $match['score_against'];
            if ($margin > 0 && ($biggest === null || $margin > $biggest)) {
                $biggest = $margin;
            }
        }

        return $biggest;
    }

    private function biggestLoss(array $matches): ?int
    {
        $biggest = null;

        foreach ($matches as $match) {
            $margin = $match['score_against'] - $match['score_for'];
            if ($margin > 0 && ($biggest === null || $margin > $biggest)) {
                $biggest = $margin;
            }
        }

        return $biggest;
    }

    private function cleanSheets(array $matches): int
    {
        $count = 0;

        foreach ($matches as $match) {
            if ($match['score_against'] === 0) {
                $count++;
            }
        }

        return $count;
    }

    private function averageAttendance(Team $team): float
    {
        $sessionCounts = Attendance::query()
            ->where('team_id', $team->id)
            ->whereNotNull('match_request_id')
            ->whereIn('status', [Attendance::PRESENT, Attendance::LATE])
            ->select('match_request_id')
            ->selectRaw('COUNT(DISTINCT player_id) as attended')
            ->groupBy('match_request_id')
            ->get();

        if ($sessionCounts->isEmpty()) {
            return 0;
        }

        return round($sessionCounts->avg('attended'), 1);
    }

    private function topPerformers(Team $team): array
    {
        $rows = TeamMatchPlayer::query()
            ->where('team_id', $team->id)
            ->select('player_id')
            ->selectRaw('SUM(goals) as total_goals')
            ->selectRaw('SUM(assists) as total_assists')
            ->selectRaw('SUM(CASE WHEN played = 1 THEN 1 ELSE 0 END) as matches_played')
            ->selectRaw('SUM(CASE WHEN mvp = 1 THEN 1 ELSE 0 END) as mvp_count')
            ->selectRaw('AVG(rating) as avg_rating')
            ->groupBy('player_id')
            ->get();

        $players = Player::whereIn('id', $rows->pluck('player_id'))->get(['id', 'name', 'number'])->keyBy('id');

        $toPlayerData = function ($row) use ($players) {
            $player = $players->get($row->player_id);

            return [
                'player_id' => $row->player_id,
                'name' => $player?->name,
                'number' => $player?->number,
                'value' => (int) $row->getAttribute('total_goals') ?? 0,
            ];
        };

        $mostActiveRow = $rows->sortByDesc('matches_played')->first();
        $topScorerRow = $rows->sortByDesc('total_goals')->first();
        $topAssistRow = $rows->sortByDesc('total_assists')->first();
        $mostValuableRow = $rows->sortByDesc('mvp_count')->sortByDesc('avg_rating')->first();

        return [
            'most_active' => $this->summaryRow($mostActiveRow, $players, 'matches_played'),
            'top_scorer' => $this->summaryRow($topScorerRow, $players, 'total_goals'),
            'top_assist' => $this->summaryRow($topAssistRow, $players, 'total_assists'),
            'most_valuable' => $this->summaryRow($mostValuableRow, $players, 'mvp_count'),
        ];
    }

    private function summaryRow($row, $players, string $valueField): ?array
    {
        if (! $row) {
            return null;
        }

        $player = $players->get($row->player_id);

        return [
            'player_id' => $row->player_id,
            'name' => $player?->name,
            'number' => $player?->number,
            'value' => (int) ($row->getAttribute($valueField) ?? 0),
        ];
    }
}
