<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentSquadMember;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;

/**
 * Per-tournament squad management. Each tournament carries its own list of
 * selected players per team, capped by Tournament::$max_players_per_team.
 */
class TournamentSquadService
{
    public function maxPlayers(Tournament $tournament): ?int
    {
        return $tournament->max_players_per_team !== null
            ? (int) $tournament->max_players_per_team
            : null;
    }

    public function assertEditable(Tournament $tournament): void
    {
        if (! $tournament->isEditable()) {
            throw new DomainException('لا يمكن تعديل قائمة اللاعبين بعد انطلاق البطولة');
        }
    }

    /**
     * Active roster players of a team annotated with their in-squad status.
     *
     * @return array{players: SupportCollection<int, array<string, mixed>>, squad_count: int, max: ?int}
     */
    public function squad(Tournament $tournament, Team $team): array
    {
        $players = Player::query()
            ->where('team_id', $team->id)
            ->active()
            ->orderBy('is_essential', 'desc')
            ->orderBy('number')
            ->orderBy('name')
            ->get();

        $memberIds = $this->memberPlayerIds($tournament, $team);

        $annotated = $players->map(fn (Player $player) => $this->serializePlayer($player, $memberIds->contains($player->id)));

        return [
            'players' => $annotated->values(),
            'squad_count' => $memberIds->count(),
            'max' => $this->maxPlayers($tournament),
        ];
    }

    /**
     * Add a roster player to the tournament squad, or remove them.
     *
     * @return array{players: SupportCollection<int, array<string, mixed>>, squad_count: int, max: ?int}
     */
    public function toggle(Tournament $tournament, Team $team, int $playerId): array
    {
        $this->assertEditable($tournament);

        $player = Player::query()
            ->where('team_id', $team->id)
            ->where('id', $playerId)
            ->active()
            ->first();

        if (! $player) {
            throw new DomainException('اللاعب غير موجود في فريقك');
        }

        $existing = TournamentSquadMember::query()
            ->where('tournament_id', $tournament->id)
            ->where('player_id', $playerId)
            ->first();

        if ($existing) {
            $existing->delete();
        } else {
            $this->assertUnderMax($tournament, $team);
            TournamentSquadMember::query()->create([
                'tournament_id' => $tournament->id,
                'team_id' => $team->id,
                'player_id' => $playerId,
            ]);
        }

        return $this->squad($tournament, $team);
    }

    /**
     * Create a roster player and link them into the tournament squad in one step.
     * Mirrors the committee add-player duplicate semantics.
     *
     * @return array{created: bool, player: ?array, duplicates: Collection, squad_count: int, max: ?int}
     */
    public function addPlayer(Tournament $tournament, Team $team, array $data): array
    {
        $this->assertEditable($tournament);

        $name = trim((string) ($data['name'] ?? ''));

        $duplicates = Player::query()
            ->where('team_id', $team->id)
            ->where('name', $name)
            ->get(['id', 'team_id', 'name', 'number', 'position']);

        if ($duplicates->isNotEmpty() && empty($data['force'])) {
            return [
                'created' => false,
                'player' => null,
                'duplicates' => $duplicates->values(),
                'squad_count' => $this->squadCount($tournament, $team),
                'max' => $this->maxPlayers($tournament),
            ];
        }

        $this->assertUnderMax($tournament, $team);

        $player = Player::query()->create([
            'team_id' => $team->id,
            'name' => $name,
            'number' => isset($data['number']) ? (int) $data['number'] : null,
            'position' => $data['position'] ?: null,
        ]);

        TournamentSquadMember::query()->create([
            'tournament_id' => $tournament->id,
            'team_id' => $team->id,
            'player_id' => $player->id,
        ]);

        return [
            'created' => true,
            'player' => $player->only(['id', 'team_id', 'name', 'number', 'position', 'is_essential']),
            'duplicates' => $duplicates->values(),
            'squad_count' => $this->squadCount($tournament, $team),
            'max' => $this->maxPlayers($tournament),
        ];
    }

    public function squadCount(Tournament $tournament, Team $team): int
    {
        return TournamentSquadMember::query()
            ->where('tournament_id', $tournament->id)
            ->where('team_id', $team->id)
            ->count();
    }

    private function assertUnderMax(Tournament $tournament, Team $team): void
    {
        $max = $this->maxPlayers($tournament);

        if ($max !== null && $this->squadCount($tournament, $team) >= $max) {
            throw new DomainException("تم الوصول للحد الأقصى للاعبين في البطولة (الحد الأقصى {$max} لاعبين)");
        }
    }

    /**
     * @return SupportCollection<int, int>
     */
    private function memberPlayerIds(Tournament $tournament, Team $team): SupportCollection
    {
        return TournamentSquadMember::query()
            ->where('tournament_id', $tournament->id)
            ->where('team_id', $team->id)
            ->pluck('player_id');
    }

    /**
     * @return array<string, mixed>
     */
    private function serializePlayer(Player $player, bool $inSquad): array
    {
        return [
            'id' => $player->id,
            'team_id' => $player->team_id,
            'name' => $player->name,
            'number' => $player->number,
            'position' => $player->position,
            'is_essential' => $player->is_essential,
            'in_squad' => $inSquad,
        ];
    }
}