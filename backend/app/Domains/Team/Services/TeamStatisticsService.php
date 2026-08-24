<?php

namespace App\Domains\Team\Services;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Match\Models\MatchRequest;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Models\Attendance;
use App\Domains\Team\Models\Team;
use App\Domains\Team\Models\TeamMatchPlayer;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class TeamStatisticsService
{
    /**
     * @param  string|null  $from  Y-m-d
     * @param  string|null  $to    Y-m-d
     * @param  string|null  $groupBy hour|day
     */
    public function for(Team $team, ?string $from = null, ?string $to = null, ?string $groupBy = null): array
    {
        // Legacy all-time path (no range filter) – keep cached behaviour for BC
        if (! $from && ! $to && ! $groupBy) {
            $ttl = (int) config('team.cache.statistics_ttl');

            return Cache::remember(TeamCache::statistics($team->id), $ttl, fn () => $this->buildBasePayload($team));
        }

        // Range-aware path – scoped cache key
        $tz = config('app.timezone', 'UTC');
        $toDate = $to ? Carbon::parse($to, $tz)->startOfDay() : Carbon::now($tz)->startOfDay();
        $fromDate = $from ? Carbon::parse($from, $tz)->startOfDay() : $toDate->copy()->subDays(29);
        if ($fromDate->gt($toDate)) {
            $fromDate = $toDate->copy()->subDays(29);
        }
        if ($fromDate->diffInDays($toDate) > 366) {
            $fromDate = $toDate->copy()->subDays(366);
        }
        $fromStr = $fromDate->toDateString();
        $toStr = $toDate->toDateString();
        $toEnd = $toDate->copy()->endOfDay();
        $isHourly = $groupBy === 'hour' && $fromStr === $toStr;

        $cacheKey = "team:statistics:{$team->id}:{$fromStr}:{$toStr}:" . ($groupBy ?? 'day');

        return Cache::remember($cacheKey, 60, fn () => $this->buildRangePayload($team, $fromDate, $toEnd, $fromStr, $toStr, $isHourly));
    }

    private function buildBasePayload(Team $team): array
    {
        $matches = $this->completedMatches($team);
        $recordedAttendance = $this->averageAttendance($team);
        $topPerformers = $this->topPerformers($team);

        $matchesPlayed = max(0, (int) $team->matches_played);
        $wins = max(0, (int) $team->wins);
        $draws = max(0, (int) $team->draws);
        $losses = max(0, (int) $team->losses);
        $goalsFor = max(0, (int) $team->goals_for);
        $goalsAgainst = max(0, (int) $team->goals_against);

        $bookingSummary = $this->bookingSummary($team);
        $matchBreakdown = $this->matchBreakdown($team);

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
            'match_breakdown' => $matchBreakdown,
            'booking_summary' => $bookingSummary,
        ];
    }

    private function buildRangePayload(Team $team, Carbon $fromDate, Carbon $toEnd, string $fromStr, string $toStr, bool $isHourly): array
    {
        // Filtered completed matches within range
        $filteredMatches = $this->completedMatchesInRange($team, $fromDate, $toEnd);

        // Overall match breakdown within range (any status)
        $breakdown = $this->matchBreakdownInRange($team, $fromDate, $toEnd);

        // Derived stats from filtered completed
        $matchesPlayed = count($filteredMatches);
        $wins = 0; $draws = 0; $losses = 0; $goalsFor = 0; $goalsAgainst = 0;
        foreach ($filteredMatches as $m) {
            $goalsFor += $m['score_for'];
            $goalsAgainst += $m['score_against'];
            if ($m['result'] === 'win') $wins++;
            elseif ($m['result'] === 'draw') $draws++;
            else $losses++;
        }

        $points = $wins * 3 + $draws;
        $goalDiff = $goalsFor - $goalsAgainst;

        // Use filtered aggregates for range payload (not Team columns)
        $series = $this->buildSeries($filteredMatches, $fromDate, $toEnd, $isHourly, $team);

        // Still need global streaks? Use filtered streak
        $recordedAttendance = $this->averageAttendance($team);
        // For range, filter top performers by date
        $topPerformers = $this->topPerformersInRange($team, $fromDate, $toEnd);

        return [
            'matches_played' => $matchesPlayed,
            'wins' => $wins,
            'draws' => $draws,
            'losses' => $losses,
            'goals_for' => $goalsFor,
            'goals_against' => $goalsAgainst,
            'goal_difference' => $goalDiff,
            'points' => $points,
            'win_rate' => $matchesPlayed > 0 ? round(($wins / $matchesPlayed) * 100, 1) : 0,
            'average_goals' => $matchesPlayed > 0 ? round($goalsFor / $matchesPlayed, 2) : 0,
            'average_goals_conceded' => $matchesPlayed > 0 ? round($goalsAgainst / $matchesPlayed, 2) : 0,
            'current_streak' => $this->currentStreak($filteredMatches),
            'longest_winning_streak' => $this->longestWinningStreak($filteredMatches),
            'biggest_win' => $this->biggestWin($filteredMatches),
            'biggest_loss' => $this->biggestLoss($filteredMatches),
            'clean_sheets' => $this->cleanSheets($filteredMatches),
            'average_attendance' => $recordedAttendance,
            'most_active_player' => $topPerformers['most_active'],
            'top_scorer' => $topPerformers['top_scorer'],
            'top_assist_provider' => $topPerformers['top_assist'],
            'most_valuable_player' => $topPerformers['most_valuable'],
            'match_breakdown' => $breakdown,
            'booking_summary' => $this->bookingSummaryInRange($team, $fromDate, $toEnd),
            'range' => ['from' => $fromStr, 'to' => $toStr, 'group_by' => $isHourly ? 'hour' : 'day'],
            'series' => $series,
        ];
    }

    private function completedMatchesInRange(Team $team, Carbon $from, Carbon $to): array
    {
        return MatchRequest::query()
            ->where('status', 'completed')
            ->whereBetween('match_datetime', [$from, $to])
            ->where(function ($q) use ($team) {
                $q->where('host_team_id', $team->id)->orWhere('opponent_team_id', $team->id);
            })
            ->orderBy('match_datetime', 'asc')
            ->get(['id', 'host_team_id', 'opponent_team_id', 'host_score', 'opponent_score', 'match_datetime'])
            ->map(function (MatchRequest $match) use ($team) {
                $isHost = (int) $match->host_team_id === (int) $team->id;
                $scoreFor = (int) ($isHost ? $match->host_score : $match->opponent_score);
                $scoreAgainst = (int) ($isHost ? $match->opponent_score : $match->host_score);
                return [
                    'date' => $match->match_datetime?->toDateString() ?? '',
                    'hour' => $match->match_datetime ? (int) $match->match_datetime->format('G') : 0,
                    'score_for' => $scoreFor,
                    'score_against' => $scoreAgainst,
                    'result' => $scoreFor > $scoreAgainst ? 'win' : ($scoreFor < $scoreAgainst ? 'loss' : 'draw'),
                    'goals_for' => $scoreFor,
                    'goals_against' => $scoreAgainst,
                ];
            })->all();
    }

    private function matchBreakdown(Team $team): array
    {
        $base = MatchRequest::query()->where(function ($q) use ($team) {
            $q->where('host_team_id', $team->id)->orWhere('opponent_team_id', $team->id);
        });

        return [
            'total' => (int) (clone $base)->count(),
            'completed' => (int) (clone $base)->where('status', 'completed')->count(),
            'upcoming' => (int) (clone $base)->whereIn('status', ['accepted', 'open'])->where('match_datetime', '>=', now())->count(),
            'cancelled' => (int) (clone $base)->where('status', 'cancelled')->count(),
        ];
    }

    private function matchBreakdownInRange(Team $team, Carbon $from, Carbon $to): array
    {
        $base = MatchRequest::query()->where(function ($q) use ($team) {
            $q->where('host_team_id', $team->id)->orWhere('opponent_team_id', $team->id);
        })->whereBetween('match_datetime', [$from, $to]);

        return [
            'total' => (int) (clone $base)->count(),
            'completed' => (int) (clone $base)->where('status', 'completed')->count(),
            'upcoming' => (int) (clone $base)->whereIn('status', ['accepted', 'open'])->count(),
            'cancelled' => (int) (clone $base)->where('status', 'cancelled')->count(),
        ];
    }

    private function bookingSummary(Team $team): array
    {
        $base = TerrainBooking::query()->where('team_id', $team->id);
        return [
            'total' => (int) (clone $base)->count(),
            'completed' => (int) (clone $base)->where('status', 'completed')->count(),
            'upcoming' => (int) (clone $base)->whereIn('status', ['pending', 'approved', 'confirmed'])->where('booking_date', '>=', now()->toDateString())->count(),
            'cancelled' => (int) (clone $base)->where('status', 'cancelled')->count(),
        ];
    }

    private function bookingSummaryInRange(Team $team, Carbon $from, Carbon $to): array
    {
        $base = TerrainBooking::query()->where('team_id', $team->id)->whereBetween('booking_date', [$from->toDateString(), $to->toDateString()]);
        return [
            'total' => (int) (clone $base)->count(),
            'completed' => (int) (clone $base)->where('status', 'completed')->count(),
            'upcoming' => (int) (clone $base)->whereIn('status', ['pending', 'approved', 'confirmed'])->count(),
            'cancelled' => (int) (clone $base)->where('status', 'cancelled')->count(),
        ];
    }

    private function topPerformersInRange(Team $team, Carbon $from, Carbon $to): array
    {
        $matchIds = MatchRequest::query()
            ->where(function ($q) use ($team) {
                $q->where('host_team_id', $team->id)->orWhere('opponent_team_id', $team->id);
            })
            ->whereBetween('match_datetime', [$from, $to])
            ->where('status', 'completed')
            ->pluck('id');

        if ($matchIds->isEmpty()) {
            return ['most_active' => null, 'top_scorer' => null, 'top_assist' => null, 'most_valuable' => null];
        }

        $rows = TeamMatchPlayer::query()
            ->where('team_id', $team->id)
            ->whereIn('match_request_id', $matchIds)
            ->select('player_id')
            ->selectRaw('SUM(goals) as total_goals')
            ->selectRaw('SUM(assists) as total_assists')
            ->selectRaw('SUM(CASE WHEN played = 1 THEN 1 ELSE 0 END) as matches_played')
            ->selectRaw('SUM(CASE WHEN mvp = 1 THEN 1 ELSE 0 END) as mvp_count')
            ->selectRaw('AVG(rating) as avg_rating')
            ->groupBy('player_id')
            ->get();

        if ($rows->isEmpty()) {
            return ['most_active' => null, 'top_scorer' => null, 'top_assist' => null, 'most_valuable' => null];
        }

        $players = Player::whereIn('id', $rows->pluck('player_id'))->get(['id', 'name', 'number'])->keyBy('id');

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

    private function buildSeries(array $matches, Carbon $from, Carbon $to, bool $isHourly, Team $team): array
    {
        if ($isHourly) {
            $buckets = [];
            for ($h = 0; $h < 24; $h++) $buckets[(string) $h] = ['goals_for' => 0, 'goals_against' => 0, 'matches' => 0];
            foreach ($matches as $m) {
                $k = (string) ($m['hour'] ?? 0);
                if (! isset($buckets[$k])) continue;
                $buckets[$k]['goals_for'] += $m['goals_for'] ?? 0;
                $buckets[$k]['goals_against'] += $m['goals_against'] ?? 0;
                $buckets[$k]['matches'] += 1;
            }
            $out = [];
            foreach ($buckets as $k => $v) $out[] = ['key' => $k, 'goals_for' => $v['goals_for'], 'goals_against' => $v['goals_against'], 'matches' => $v['matches']];
            return $out;
        }

        // Daily series
        $buckets = [];
        for ($d = $from->copy(); $d->lte($to); $d->addDay()) $buckets[$d->toDateString()] = ['goals_for' => 0, 'goals_against' => 0, 'matches' => 0];
        foreach ($matches as $m) {
            $k = $m['date'] ?? null;
            if (! $k || ! isset($buckets[$k])) continue;
            $buckets[$k]['goals_for'] += $m['goals_for'] ?? 0;
            $buckets[$k]['goals_against'] += $m['goals_against'] ?? 0;
            $buckets[$k]['matches'] += 1;
        }
        $out = [];
        foreach ($buckets as $k => $v) $out[] = ['key' => $k, 'goals_for' => $v['goals_for'], 'goals_against' => $v['goals_against'], 'matches' => $v['matches']];
        return $out;
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
