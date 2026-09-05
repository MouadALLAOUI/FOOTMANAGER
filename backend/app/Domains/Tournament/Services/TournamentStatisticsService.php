<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Match\Enums\MatchEventType;
use App\Domains\Match\Enums\MatchPunishment;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchEvent;
use App\Domains\Match\Models\PlayerMatchPerformance;
use App\Domains\Player\Models\Player;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use Illuminate\Support\Collection;

class TournamentStatisticsService
{
    /**
     * @return array<string, mixed>
     */
    public function statistics(Tournament $tournament): array
    {
        $competitionId = $tournament->competition_id;
        $seasonId = $tournament->season_id;

        $finishedMatches = FootballMatch::query()
            ->where('competition_id', $competitionId)
            ->where('season_id', $seasonId)
            ->where('status', MatchStatus::Finished)
            ->get(['id', 'home_team_id', 'away_team_id', 'home_score', 'away_score', 'winner_team_id', 'started_at', 'ended_at']);

        $matchIds = $finishedMatches->pluck('id');

        $totalGoals = 0;
        $biggestWin = ['home' => 0, 'away' => 0, 'margin' => 0];
        $teamGoalsFor = [];
        $teamGoalsAgainst = [];
        $teamCleanSheets = [];
        $mostGoalsInMatch = null;

        foreach ($finishedMatches as $match) {
            $homeGoals = (int) $match->home_score;
            $awayGoals = (int) $match->away_score;
            $totalGoals += $homeGoals + $awayGoals;

            $teamGoalsFor[$match->home_team_id] = ($teamGoalsFor[$match->home_team_id] ?? 0) + $homeGoals;
            $teamGoalsFor[$match->away_team_id] = ($teamGoalsFor[$match->away_team_id] ?? 0) + $awayGoals;
            $teamGoalsAgainst[$match->home_team_id] = ($teamGoalsAgainst[$match->home_team_id] ?? 0) + $awayGoals;
            $teamGoalsAgainst[$match->away_team_id] = ($teamGoalsAgainst[$match->away_team_id] ?? 0) + $homeGoals;

            if ($homeGoals === 0) {
                $teamCleanSheets[$match->away_team_id] = ($teamCleanSheets[$match->away_team_id] ?? 0) + 1;
            }
            if ($awayGoals === 0) {
                $teamCleanSheets[$match->home_team_id] = ($teamCleanSheets[$match->home_team_id] ?? 0) + 1;
            }

            $matchTotal = $homeGoals + $awayGoals;
            if ($mostGoalsInMatch === null || $matchTotal > $mostGoalsInMatch['total']) {
                $mostGoalsInMatch = [
                    'home' => $match->home_team_id,
                    'away' => $match->away_team_id,
                    'home_score' => $homeGoals,
                    'away_score' => $awayGoals,
                    'total' => $matchTotal,
                ];
            }

            $margin = abs($homeGoals - $awayGoals);
            if ($margin > $biggestWin['margin']) {
                $biggestWin = [
                    'home' => $match->home_team_id,
                    'away' => $match->away_team_id,
                    'home_score' => $homeGoals,
                    'away_score' => $awayGoals,
                    'margin' => $margin,
                ];
            }
        }

        $events = MatchEvent::query()
            ->whereIn('match_id', $matchIds)
            ->get(['id', 'match_id', 'team_id', 'player_id', 'assist_player_id', 'type', 'punishment', 'minute']);

        $scorers = [];
        $ownGoals = [];
        $assists = [];
        $yellowCards = [];
        $redCards = [];

        foreach ($events as $event) {
            if (in_array($event->type, [MatchEventType::Goal, MatchEventType::PenaltyGoal], true) && $event->player_id) {
                $scorers[$event->player_id] = [
                    'count' => ($scorers[$event->player_id]['count'] ?? 0) + 1,
                    'team_id' => $event->team_id,
                ];
            }

            if ($event->type === MatchEventType::OwnGoal && $event->player_id) {
                $ownGoals[$event->player_id] = ($ownGoals[$event->player_id] ?? 0) + 1;
            }

            if ($event->type === MatchEventType::Assist && $event->player_id) {
                $assists[$event->player_id] = ($assists[$event->player_id] ?? 0) + 1;
            } elseif ($event->assist_player_id
                && in_array($event->type, [MatchEventType::Goal, MatchEventType::PenaltyGoal, MatchEventType::OwnGoal], true)) {
                $assists[$event->assist_player_id] = ($assists[$event->assist_player_id] ?? 0) + 1;
            }

            if ($event->type === MatchEventType::YellowCard && $event->player_id) {
                $yellowCards[$event->player_id] = ($yellowCards[$event->player_id] ?? 0) + 1;
            }

            if (in_array($event->type, [MatchEventType::RedCard, MatchEventType::SecondYellow], true) && $event->player_id) {
                $redCards[$event->player_id] = ($redCards[$event->player_id] ?? 0) + 1;
            }

            if ($event->type === MatchEventType::Foul && $event->player_id && $event->punishment) {
                if ($event->punishment->isDismissal() || $event->punishment === MatchPunishment::Red) {
                    $redCards[$event->player_id] = ($redCards[$event->player_id] ?? 0) + 1;
                } elseif ($event->punishment === MatchPunishment::Yellow) {
                    $yellowCards[$event->player_id] = ($yellowCards[$event->player_id] ?? 0) + 1;
                }
            }
        }

        $playerIds = collect([array_keys($scorers), array_keys($assists), array_keys($yellowCards), array_keys($redCards)])
            ->flatten()
            ->unique()
            ->map('intval')
            ->all();

        $players = $playerIds ? Player::query()->whereKey($playerIds)->get(['id', 'team_id', 'name']) : collect();

        $playerMap = [];
        foreach ($players as $player) {
            $playerMap[$player->id] = [
                'id' => $player->id,
                'name' => $player->name,
                'team_id' => $player->team_id,
            ];
        }

        $countTeamIds = [];
        foreach ($playerMap as $info) {
            if (! empty($info['team_id'])) {
                $countTeamIds[] = $info['team_id'];
            }
        }
        foreach ($scorers as $info) {
            if (! empty($info['team_id'])) {
                $countTeamIds[] = $info['team_id'];
            }
        }

        $teamIds = collect([$countTeamIds, array_keys($teamGoalsFor), $finishedMatches->pluck('winner_team_id')->all()])
            ->flatten()
            ->unique()
            ->map('intval')
            ->all();

        $teams = $teamIds ? Team::query()->withTrashed()->whereKey($teamIds)->get(['id', 'name', 'logo_path']) : collect();

        $teamMap = [];
        foreach ($teams as $team) {
            $teamMap[$team->id] = [
                'name' => $team->name,
                'logo_url' => $team->logo_url,
            ];
        }

        $bestAttack = null;
        $bestDefense = null;

        foreach ($teamGoalsFor as $teamId => $goals) {
            if ($bestAttack === null || $goals > $bestAttack['goals']) {
                $bestAttack = ['team_id' => $teamId, 'goals' => $goals];
            }
        }

        foreach ($teamGoalsAgainst as $teamId => $goals) {
            if ($bestDefense === null || $goals < $bestDefense['goals_against']) {
                $bestDefense = ['team_id' => $teamId, 'goals_against' => $goals];
            }
        }

        $bestGoalkeeper = $this->bestGoalkeeper($matchIds, $playerMap, $teamMap);

        $plan = $tournament->plan ?? [];

        return [
            'summary' => [
                'matches_played' => $finishedMatches->count(),
                'total_goals' => $totalGoals,
                'average_goals_per_match' => $finishedMatches->count() > 0 ? round($totalGoals / $finishedMatches->count(), 2) : 0,
                'finished' => $finishedMatches->count(),
                'scheduled' => FootballMatch::query()
                    ->where('competition_id', $competitionId)
                    ->where('season_id', $seasonId)
                    ->where('status', MatchStatus::Scheduled)
                    ->count(),
            ],
            'top_scorers' => $this->ranked($scorers, $playerMap, $teamMap),
            'own_goals' => $this->ranked($ownGoals, $playerMap, $teamMap),
            'top_assists' => $this->ranked($assists, $playerMap, $teamMap),
            'yellow_cards' => $this->ranked($yellowCards, $playerMap, $teamMap),
            'red_cards' => $this->ranked($redCards, $playerMap, $teamMap),
            'best_attack' => $bestAttack ? $this->teamInfo($bestAttack['team_id'], $teams) + ['goals' => $bestAttack['goals']] : null,
            'best_defense' => $bestDefense ? $this->teamInfo($bestDefense['team_id'], $teams) + ['goals_against' => $bestDefense['goals_against']] : null,
            'best_goalkeeper' => $bestGoalkeeper,
            'records' => [
                'most_goals_in_match' => $mostGoalsInMatch !== null && $mostGoalsInMatch['total'] > 0 ? [
                    'home_score' => $mostGoalsInMatch['home_score'],
                    'away_score' => $mostGoalsInMatch['away_score'],
                    'total' => $mostGoalsInMatch['total'],
                    'home_team' => $this->teamInfo($mostGoalsInMatch['home'], $teams),
                    'away_team' => $this->teamInfo($mostGoalsInMatch['away'], $teams),
                ] : null,
                'biggest_win' => $biggestWin['margin'] > 0 ? [
                    'home_score' => $biggestWin['home_score'],
                    'away_score' => $biggestWin['away_score'],
                    'home_team' => $this->teamInfo($biggestWin['home'], $teams),
                    'away_team' => $this->teamInfo($biggestWin['away'], $teams),
                ] : null,
                'most_clean_sheets' => $this->bestTeamByCount($teamCleanSheets, $teams),
                'most_consecutive_wins' => $this->longestWinningStreak($finishedMatches, $teams),
            ],
            'biggest_win' => $biggestWin['margin'] > 0 ? [
                'home_score' => $biggestWin['home_score'],
                'away_score' => $biggestWin['away_score'],
                'home_team' => $this->teamInfo($biggestWin['home'], $teams),
                'away_team' => $this->teamInfo($biggestWin['away'], $teams),
            ] : null,
            'champion_team_id' => $plan['champion_team_id'] ?? null,
            'champion' => isset($plan['champion_team_id']) ? $this->teamInfo($plan['champion_team_id'], $teams) : null,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $counts
     * @param  array<int, array<string, mixed>>  $playerMap
     * @param  array<int, array<string, mixed>>  $teamMap
     * @return array<int, array<string, mixed>>
     */
    private function ranked(array $counts, array $playerMap, array $teamMap = [], int $limit = 10): array
    {
        $rows = [];

        foreach ($counts as $playerId => $value) {
            $count = is_array($value) ? $value['count'] : $value;
            $teamId = is_array($value) ? ($value['team_id'] ?? null) : ($playerMap[$playerId]['team_id'] ?? null);
            $team = $teamMap[$teamId] ?? null;

            $rows[] = [
                'player_id' => (int) $playerId,
                'name' => $playerMap[$playerId]['name'] ?? null,
                'team_id' => $teamId,
                'team_name' => $team['name'] ?? null,
                'team_logo_url' => $team['logo_url'] ?? null,
                'count' => $count,
            ];
        }

        usort($rows, fn (array $a, array $b) => $b['count'] <=> $a['count']);

        return array_slice($rows, 0, $limit);
    }

    /**
     * @param  Collection<int, Team>  $teams
     * @return array<string, mixed>
     */
    private function teamInfo(int $teamId, $teams): array
    {
        $team = $teams->firstWhere('id', $teamId);

        return $team ? [
            'team_id' => $team->id,
            'name' => $team->name,
            'logo_url' => $team->logo_url,
        ] : [
            'team_id' => $teamId,
            'name' => null,
            'logo_url' => null,
        ];
    }

    /**
     * Goalkeeper with the most clean sheets across the tournament's finished matches.
     *
     * @param  Collection<int, int>  $matchIds
     * @param  array<int, array<string, mixed>>  $playerMap
     * @param  array<int, array<string, mixed>>  $teamMap
     * @return array<string, mixed>|null
     */
    private function bestGoalkeeper(Collection $matchIds, array $playerMap, array $teamMap): ?array
    {
        if ($matchIds->isEmpty()) {
            return null;
        }

        $keeperIds = [];

        PlayerMatchPerformance::query()
            ->whereIn('match_id', $matchIds)
            ->where('clean_sheet', true)
            ->get(['id', 'player_id', 'team_id', 'clean_sheet'])
            ->each(function (PlayerMatchPerformance $performance) use (&$keeperIds) {
                $keeperIds[$performance->player_id] = ($keeperIds[$performance->player_id] ?? 0) + 1;
                $keeperIds[$performance->player_id.'_team'] = $performance->team_id;
            });

        if (empty($keeperIds)) {
            return null;
        }

        $playerIds = array_values(array_filter(array_keys($keeperIds), 'is_int'));
        $players = $playerIds ? Player::query()->whereKey($playerIds)->get(['id', 'team_id', 'name']) : collect();

        $best = null;
        foreach ($keeperIds as $key => $count) {
            if (is_string($key)) {
                continue;
            }
            $player = $players->firstWhere('id', $key);
            $teamId = $keeperIds[$key.'_team'] ?? $player?->team_id;
            $team = $teamMap[$teamId] ?? null;

            if ($best === null || $count > $best['clean_sheets']) {
                $best = [
                    'player_id' => $key,
                    'name' => $player?->name ?? $playerMap[$key]['name'] ?? null,
                    'team_id' => $teamId,
                    'team_name' => $team['name'] ?? $playerMap[$key]['team_name'] ?? null,
                    'team_logo_url' => $team['logo_url'] ?? $playerMap[$key]['team_logo_url'] ?? null,
                    'clean_sheets' => $count,
                ];
            }
        }

        return $best;
    }

    /**
     * Team with the highest count for a given per-team tally.
     *
     * @param  array<int, int>  $counts
     * @param  Collection<int, Team>  $teams
     * @return array<string, mixed>|null
     */
    private function bestTeamByCount(array $counts, $teams): ?array
    {
        if (empty($counts)) {
            return null;
        }

        $teamId = array_keys($counts)[0];
        $count = $counts[$teamId];

        foreach ($counts as $candidateId => $candidateCount) {
            if ($candidateCount > $count) {
                $teamId = $candidateId;
                $count = $candidateCount;
            }
        }

        return [
            'team' => $this->teamInfo((int) $teamId, $teams),
            'count' => $count,
        ];
    }

    /**
     * Longest run of consecutive wins by a single team.
     *
     * @param  Collection<int, FootballMatch>  $finishedMatches
     * @param  Collection<int, Team>  $teams
     * @return array<string, mixed>|null
     */
    private function longestWinningStreak(Collection $finishedMatches, $teams): ?array
    {
        if ($finishedMatches->isEmpty()) {
            return null;
        }

        $resultsByTeam = [];

        $finishedMatches
            ->sortBy(function (FootballMatch $match) {
                $date = $match->ended_at ?? $match->started_at;

                return $date?->format('Y-m-d H:i:s') ?? (string) $match->id;
            })
            ->each(function (FootballMatch $match) use (&$resultsByTeam) {
                $home = (int) $match->home_score <=> (int) $match->away_score;

                foreach ([
                    [$match->home_team_id, $home],
                    [$match->away_team_id, $home === 0 ? 0 : -$home],
                ] as [$teamId, $result]) {
                    if ($teamId === null) {
                        continue;
                    }

                    $resultsByTeam[(int) $teamId][] = match ($result) {
                        1 => 'W',
                        0 => 'D',
                        default => 'L',
                    };
                }
            });

        $best = null;

        foreach ($resultsByTeam as $teamId => $marks) {
            $streak = 0;
            $bestStreak = 0;

            foreach ($marks as $mark) {
                if ($mark === 'W') {
                    $streak++;
                    $bestStreak = max($bestStreak, $streak);
                    continue;
                }

                $streak = 0;
            }

            if ($bestStreak > 0 && ($best === null || $bestStreak > $best['count'])) {
                $best = [
                    'team' => $this->teamInfo((int) $teamId, $teams),
                    'count' => $bestStreak,
                ];
            }
        }

        return $best;
    }
}
