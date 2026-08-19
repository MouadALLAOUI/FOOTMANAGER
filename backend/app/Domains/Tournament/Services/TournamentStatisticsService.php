<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Match\Enums\MatchEventType;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchEvent;
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
            ->get(['id', 'home_team_id', 'away_team_id', 'home_score', 'away_score', 'winner_team_id']);

        $matchIds = $finishedMatches->pluck('id');

        $totalGoals = 0;
        $biggestWin = ['home' => 0, 'away' => 0, 'margin' => 0];
        $teamGoalsFor = [];
        $teamGoalsAgainst = [];

        foreach ($finishedMatches as $match) {
            $totalGoals += (int) $match->home_score + (int) $match->away_score;

            $homeGoals = (int) $match->home_score;
            $awayGoals = (int) $match->away_score;

            $teamGoalsFor[$match->home_team_id] = ($teamGoalsFor[$match->home_team_id] ?? 0) + $homeGoals;
            $teamGoalsFor[$match->away_team_id] = ($teamGoalsFor[$match->away_team_id] ?? 0) + $awayGoals;
            $teamGoalsAgainst[$match->home_team_id] = ($teamGoalsAgainst[$match->home_team_id] ?? 0) + $awayGoals;
            $teamGoalsAgainst[$match->away_team_id] = ($teamGoalsAgainst[$match->away_team_id] ?? 0) + $homeGoals;

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
            ->get(['id', 'match_id', 'team_id', 'player_id', 'type', 'minute']);

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
            }

            if ($event->type === MatchEventType::YellowCard && $event->player_id) {
                $yellowCards[$event->player_id] = ($yellowCards[$event->player_id] ?? 0) + 1;
            }

            if (in_array($event->type, [MatchEventType::RedCard, MatchEventType::SecondYellow], true) && $event->player_id) {
                $redCards[$event->player_id] = ($redCards[$event->player_id] ?? 0) + 1;
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

        $teams = $teamIds ? Team::query()->whereKey($teamIds)->get(['id', 'name', 'logo_path']) : collect();

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
}
