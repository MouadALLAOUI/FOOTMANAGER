<?php

namespace App\Domains\Match\Repositories;

use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;

class MatchRepository
{
    public function findById(int $id): ?FootballMatch
    {
        return FootballMatch::query()
            ->with([
                'homeTeam',
                'awayTeam',
                'stadium',
                'winnerTeam',
                'matchRequest',
            ])
            ->find($id);
    }

    public function findByUuid(string $uuid): ?FootballMatch
    {
        return FootballMatch::query()
            ->with([
                'homeTeam',
                'awayTeam',
                'stadium',
                'winnerTeam',
                'matchRequest',
            ])
            ->where('uuid', $uuid)
            ->first();
    }

    public function live(): array
    {
        return FootballMatch::query()
            ->live()
            ->with([
                'homeTeam',
                'awayTeam',
                'stadium',
                'winnerTeam',
                'matchRequest',
            ])
            ->orderBy('kicked_off_at')
            ->get()
            ->all();
    }

    public function latestFinished(int $limit = 10): array
    {
        return FootballMatch::query()
            ->where('status', MatchStatus::Finished)
            ->with(['homeTeam', 'awayTeam', 'winnerTeam', 'stadium'])
            ->latest('ended_at')
            ->limit($limit)
            ->get()
            ->all();
    }

    public function forTeam(int $teamId, ?int $limit = null): array
    {
        $query = FootballMatch::query()
            ->forTeam($teamId)
            ->with(['homeTeam', 'awayTeam', 'winnerTeam', 'stadium'])
            ->latest();

        if ($limit !== null) {
            $query->limit($limit);
        }

        return $query->get()->all();
    }
}
