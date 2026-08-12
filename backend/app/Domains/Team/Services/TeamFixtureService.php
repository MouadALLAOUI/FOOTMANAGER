<?php

namespace App\Domains\Team\Services;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Team\Models\Team;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class TeamFixtureService
{
    public function upcoming(Team $team, int $limit = 50): Collection
    {
        return MatchRequest::query()
            ->with([
                'hostTeam:id,name,logo_path',
                'opponentTeam:id,name,logo_path',
                'stadium:id,name,city,address',
            ])
            ->where('status', 'accepted')
            ->where('match_datetime', '>=', now())
            ->where(function ($q) use ($team) {
                $q->where('host_team_id', $team->id)
                    ->orWhere('opponent_team_id', $team->id);
            })
            ->orderBy('match_datetime', 'asc')
            ->limit($limit)
            ->get()
            ->map(fn (MatchRequest $match) => $this->decorate($match, $team));
    }

    public function history(Team $team, int $perPage = 15): LengthAwarePaginator
    {
        $paginator = MatchRequest::query()
            ->with([
                'hostTeam:id,name,logo_path',
                'opponentTeam:id,name,logo_path',
                'stadium:id,name,city,address',
            ])
            ->with(['teamMatchPlayers' => fn ($q) => $q->where('team_id', $team->id)->with('player:id,name,number')])
            ->where('status', 'completed')
            ->where(function ($q) use ($team) {
                $q->where('host_team_id', $team->id)
                    ->orWhere('opponent_team_id', $team->id);
            })
            ->orderBy('match_datetime', 'desc')
            ->paginate($perPage);

        return $paginator->through(fn (MatchRequest $match) => $this->decorate($match, $team, true));
    }

    private function decorate(MatchRequest $match, Team $team, bool $withResult = false): array
    {
        $isHost = (int) $match->host_team_id === (int) $team->id;
        $opponent = $isHost ? $match->opponentTeam : $match->hostTeam;

        $data = [
            'id' => $match->id,
            'match_datetime' => $match->match_datetime,
            'date' => $match->match_datetime?->toDateString(),
            'time' => $match->match_datetime?->format('H:i'),
            'opponent' => $opponent ? [
                'id' => $opponent->id,
                'name' => $opponent->name,
                'logo_url' => $opponent->logo_url,
            ] : null,
            'stadium' => $match->stadium ? [
                'id' => $match->stadium->id,
                'name' => $match->stadium->name,
                'city' => $match->stadium->city,
                'address' => $match->stadium->address,
            ] : null,
            'city' => $match->stadium?->city,
            'competition' => $this->competition($match),
            'status' => $match->status,
            'is_home' => $isHost,
        ];

        if ($withResult) {
            $scoreFor = (int) ($isHost ? $match->host_score : $match->opponent_score);
            $scoreAgainst = (int) ($isHost ? $match->opponent_score : $match->host_score);

            $result = $scoreFor > $scoreAgainst ? 'win' : ($scoreFor < $scoreAgainst ? 'loss' : 'draw');

            $ratings = $match->teamMatchPlayers
                ->filter(fn ($tmp) => $tmp->rating !== null)
                ->map(fn ($tmp) => [
                    'player_id' => $tmp->player_id,
                    'player_name' => $tmp->player?->name,
                    'rating' => (float) $tmp->rating,
                    'goals' => (int) $tmp->goals,
                    'assists' => (int) $tmp->assists,
                    'mvp' => (bool) $tmp->mvp,
                ])
                ->values()
                ->all();

            $mvp = $match->teamMatchPlayers->firstWhere('mvp', true);

            $data['score'] = ['for' => $scoreFor, 'against' => $scoreAgainst];
            $data['result'] = $result;
            $data['goals_for'] = $scoreFor;
            $data['goals_against'] = $scoreAgainst;
            $data['player_ratings'] = $ratings;
            $data['mvp'] = $mvp ? [
                'player_id' => $mvp->player_id,
                'player_name' => $mvp->player?->name,
                'rating' => (float) $mvp->rating,
            ] : null;
        }

        return $data;
    }

    private function competition(MatchRequest $match): string
    {
        return match ($match->type) {
            'direct_challenge' => 'friendly',
            default => 'friendly',
        };
    }
}
