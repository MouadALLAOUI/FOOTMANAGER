<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Shared\Support\ArabicPlural;
use App\Domains\Shared\Support\PlayerCache;
use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentSquadMember;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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
            'position' => $data['position'] ?? null,
        ]);

        TournamentSquadMember::query()->create([
            'tournament_id' => $tournament->id,
            'team_id' => $team->id,
            'player_id' => $player->id,
        ]);

        TeamCache::flushTeam($team->id);

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

    /**
     * Create several roster players and link them into the tournament squad in
     * one atomic batch. All rows are validated first; if any row fails nothing
     * is created and per-row errors are reported under `players.{index}.*`.
     *
     * Name/duplicate and jersey-number rules mirror the single add (numbers
     * above zero must be unique per team; `0`/`null` mean "no number").
     *
     * @return array{players: SupportCollection<int, array<string, mixed>>, squad_count: int, max: ?int, created_count: int}
     */
    public function storeBulk(Tournament $tournament, Team $team, array $rows): array
    {
        $normalized = collect($rows)
            ->map(fn (array $row) => [
                'name' => trim((string) ($row['name'] ?? '')),
                'number' => ($row['number'] ?? null) !== null ? (int) $row['number'] : null,
            ])
            ->values();

        if ($normalized->some(fn (array $row) => $row['name'] === '')) {
            throw ValidationException::withMessages(['players' => 'أدخل اسم اللاعب في كل سطر']);
        }

        $max = $this->maxPlayers($tournament);
        if ($max !== null && $this->squadCount($tournament, $team) + $normalized->count() > $max) {
            throw ValidationException::withMessages([
                'players' => 'عدد اللاعبين يتجاوز الحد الأقصى للبطولة (الحد الأقصى: '.ArabicPlural::players($max).')',
            ]);
        }

        $roster = Player::query()
            ->where('team_id', $team->id)
            ->get(['id', 'name', 'number']);

        $errors = [];
        $seenNames = [];
        $seenNumbers = [];

        foreach ($normalized as $i => $row) {
            $nameKey = mb_strtolower($row['name']);

            $nameTaken = $roster->contains(fn (Player $p) => mb_strtolower((string) $p->name) === $nameKey)
                || in_array($nameKey, $seenNames, true);

            if ($nameTaken) {
                $errors["players.{$i}.name"] = 'يوجد لاعب آخر بنفس الاسم في الفريق';
            } else {
                $seenNames[] = $nameKey;
            }

            $number = $row['number'];
            if ($number !== null && $number > 0) {
                $numberTaken = $roster->contains(fn (Player $p) => $p->number !== null && (int) $p->number === $number)
                    || in_array($number, $seenNumbers, true);

                if ($numberTaken) {
                    $errors["players.{$i}.number"] = 'رقم القميص محجوز من قبل لاعب آخر';
                } else {
                    $seenNumbers[] = $number;
                }
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $created = DB::transaction(function () use ($tournament, $team, $normalized): array {
            $players = [];

            foreach ($normalized as $row) {
                $player = Player::query()->create([
                    'team_id' => $team->id,
                    'name' => $row['name'],
                    'number' => $row['number'],
                ]);

                TournamentSquadMember::query()->create([
                    'tournament_id' => $tournament->id,
                    'team_id' => $team->id,
                    'player_id' => $player->id,
                ]);

                $players[] = $player;
            }

            TeamCache::flushTeam($team->id);

            return $players;
        });

        return $this->squad($tournament, $team) + ['created_count' => count($created)];
    }

    /**
     * Edit a roster player's name and/or jersey number. The squad list stays
     * usable throughout the tournament, so mismatched names/numbers can be
     * fixed (and players added) even after it starts—events keep referencing
     * the player row. Name and number uniqueness are validated per team.
     *
     * @return array{players: SupportCollection<int, array<string, mixed>>, squad_count: int, max: ?int}
     */
    public function updatePlayer(Tournament $tournament, Team $team, Player $player, array $data): array
    {
        if ((int) $player->team_id !== (int) $team->id) {
            throw new DomainException('اللاعب غير موجود في فريقك');
        }

        $errors = [];
        $update = [];

        if (array_key_exists('name', $data)) {
            $name = trim((string) $data['name']);

            if ($name === '') {
                $errors['name'] = 'اسم اللاعب مطلوب';
            } else {
                $nameTaken = Player::query()
                    ->where('team_id', $team->id)
                    ->where('id', '!=', $player->id)
                    ->get(['id', 'name'])
                    ->contains(fn (Player $p) => mb_strtolower((string) $p->name) === mb_strtolower($name));

                if ($nameTaken) {
                    $errors['name'] = 'يوجد لاعب آخر بنفس الاسم في الفريق';
                } else {
                    $update['name'] = $name;
                }
            }
        }

        if (array_key_exists('number', $data)) {
            $number = ($data['number'] ?? null) !== null ? (int) $data['number'] : null;

            if ($number !== null && $number > 0) {
                $numberTaken = Player::query()
                    ->where('team_id', $team->id)
                    ->where('id', '!=', $player->id)
                    ->where('number', $number)
                    ->exists();

                if ($numberTaken) {
                    $errors['number'] = 'رقم القميص محجوز من قبل لاعب آخر';
                } else {
                    $update['number'] = $number;
                }
            } else {
                $update['number'] = $number;
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        if ($update === []) {
            return $this->squad($tournament, $team);
        }

        $player->update($update);

        TeamCache::flushTeam($team->id);

        if ($player->user_id !== null) {
            PlayerCache::flush((int) $player->user_id);
        }

        return $this->squad($tournament, $team);
    }

    private function assertUnderMax(Tournament $tournament, Team $team): void
    {
        $max = $this->maxPlayers($tournament);

        if ($max !== null && $this->squadCount($tournament, $team) >= $max) {
            throw new DomainException('تم الوصول للحد الأقصى للاعبين في البطولة (الحد الأقصى: '.ArabicPlural::players($max).')');
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