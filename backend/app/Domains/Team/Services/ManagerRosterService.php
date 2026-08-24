<?php

namespace App\Domains\Team\Services;

use App\Domains\Player\Models\Player;
use App\Domains\Team\Models\Team;
use App\Domains\Player\Models\PlayerProfile;
use App\Domains\Notification\Services\NotificationService;
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

    /**
     * Get active permanent members for a team.
     *
     * @return Collection<int, Player>
     */
    public function activeMembers(int $teamId): Collection
    {
        return Player::where('team_id', $teamId)
            ->active()
            ->orderBy('is_essential', 'desc')
            ->orderBy('number')
            ->orderBy('name')
            ->get();
    }

    /**
     * Get essential players for a team.
     *
     * @return Collection<int, Player>
     */
    public function essentialPlayers(int $teamId): Collection
    {
        return Player::where('team_id', $teamId)
            ->active()
            ->essential()
            ->orderBy('number')
            ->orderBy('name')
            ->get();
    }

    /**
     * Soft-remove a player from the team (set inactive).
     * Preserves historical match records.
     */
    public function removeMember(Player $player): Player
    {
        $player->update(['status' => Player::STATUS_UNAVAILABLE]);

        return $player->fresh();
    }

    /**
     * Reactivate a previously removed player.
     */
    public function reactivateMember(Player $player): Player
    {
        $player->update(['status' => Player::STATUS_ACTIVE]);

        return $player->fresh();
    }

    /**
     * Toggle a player's essential status.
     */
    public function toggleEssential(Player $player): Player
    {
        $player->update(['is_essential' => ! $player->is_essential]);

        return $player->fresh();
    }

    /**
     * Change a player's team position. Returns old and new position for notification.
     */
    public function changePosition(Player $player, string $newPosition): array
    {
        $oldPosition = $player->position;
        $player->update(['position' => $newPosition]);

        return [
            'old_position' => $oldPosition,
            'new_position' => $newPosition,
        ];
    }
}
