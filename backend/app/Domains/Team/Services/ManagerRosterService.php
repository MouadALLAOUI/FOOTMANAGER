<?php

namespace App\Domains\Team\Services;

use App\Domains\Player\Models\Player;
use Illuminate\Database\Eloquent\Collection;

/**
 * Manager roster operations, extracted from the legacy manager player
 * controller. Behaviour is intentionally unchanged.
 */
class ManagerRosterService
{
    /** @return Collection<int, Player> */
    public function list(int $teamId): Collection
    {
        return Player::where('team_id', $teamId)
            ->orderBy('number')
            ->orderBy('name')
            ->get();
    }

    public function create(int $teamId, array $validated): Player
    {
        return Player::create([
            'team_id' => $teamId,
            'name' => $validated['name'],
            'position' => $validated['position'] ?? null,
            'number' => $validated['number'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'is_whatsapp' => $validated['is_whatsapp'] ?? false,
            'notes' => $validated['notes'] ?? null,
        ]);
    }

    public function findForTeam(int $teamId, int $id): ?Player
    {
        return Player::where('team_id', $teamId)
            ->where('id', $id)
            ->first();
    }

    public function update(Player $player, array $validated): Player
    {
        $player->update($validated);

        return $player->fresh();
    }

    public function delete(Player $player): void
    {
        $player->delete();
    }
}
