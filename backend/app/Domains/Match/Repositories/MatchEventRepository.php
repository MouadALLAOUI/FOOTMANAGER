<?php

namespace App\Domains\Match\Repositories;

use App\Domains\Match\Models\MatchEvent;

class MatchEventRepository
{
    public function forMatch(int $matchId): array
    {
        return MatchEvent::query()
            ->where('match_id', $matchId)
            ->with(['team', 'player', 'assistPlayer'])
            ->orderBy('minute')
            ->orderBy('id')
            ->get()
            ->all();
    }

    public function findById(int $id): ?MatchEvent
    {
        return MatchEvent::query()
            ->with(['match', 'team', 'player', 'assistPlayer'])
            ->find($id);
    }

    public function create(int $matchId, array $data): MatchEvent
    {
        return MatchEvent::query()->create([
            'match_id' => $matchId,
            ...$data,
        ]);
    }

    public function update(MatchEvent $event, array $data): MatchEvent
    {
        $event->update($data);

        return $event;
    }

    public function delete(MatchEvent $event): void
    {
        $event->delete();
    }
}
