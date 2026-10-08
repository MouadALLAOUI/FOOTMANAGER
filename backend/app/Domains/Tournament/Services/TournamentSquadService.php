<?php

namespace App\Domains\Tournament\Services;

use App\Domains\Match\Models\FootballMatch;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Exceptions\DomainException;
use App\Domains\Shared\Services\ImageThumbnailService;
use App\Domains\Shared\Support\ArabicPlural;
use App\Domains\Shared\Support\PlayerCache;
use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentSquadMember;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Per-tournament squad management. Each tournament carries its own list of
 * selected players per team, capped by Tournament::$max_players_per_team.
 */
class TournamentSquadService
{
    public function __construct(private readonly ImageThumbnailService $images)
    {
    }

    public function maxPlayers(Tournament $tournament): ?int
    {
        return $tournament->max_players_per_team !== null
            ? (int) $tournament->max_players_per_team
            : null;
    }

    public function minPlayers(Tournament $tournament): ?int
    {
        if (isset($tournament->min_players_per_team) && $tournament->min_players_per_team !== null) {
            return (int) $tournament->min_players_per_team;
        }

        return null;
    }

    public function minimumWarning(Tournament $tournament, Team $team): ?string
    {
        $min = $this->minPlayers($tournament);
        if ($min !== null && $this->squadCount($tournament, $team) < $min) {
            return 'الفريق يلعب بعدد أقل من العدد المحدد للبطولة.';
        }

        return null;
    }

    /**
     * Active and registered roster players of a team annotated with their in-squad status.
     *
     * @return array{players: SupportCollection<int, array<string, mixed>>, squad_count: int, max: ?int, min: ?int, warning: ?string}
     */
    public function squad(Tournament $tournament, Team $team): array
    {
        $players = Player::query()
            ->where('team_id', $team->id)
            ->where('status', '!=', Player::STATUS_UNAVAILABLE)
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
            'min' => $this->minPlayers($tournament),
            'warning' => $this->minimumWarning($tournament, $team),
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
    public function addPlayer(Tournament $tournament, Team $team, array $data, ?UploadedFile $photo = null): array
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

        $photoData = [];
        if ($photo && $this->images) {
            $stored = $this->images->storeWithThumbnail($photo, 'players/photos');
            $photoData['photo_path'] = $stored['path'];
            $photoData['photo_thumbnail_path'] = $stored['thumbnail_path'];
        }

        $player = Player::query()->create(array_merge([
            'team_id' => $team->id,
            'name' => $name,
            'number' => isset($data['number']) && $data['number'] !== '' ? (int) $data['number'] : null,
            'position' => $data['position'] ?? null,
            'status' => $data['status'] ?? Player::STATUS_ACTIVE,
            'is_essential' => ! empty($data['is_essential']),
        ], $photoData));

        TournamentSquadMember::query()->create([
            'tournament_id' => $tournament->id,
            'team_id' => $team->id,
            'player_id' => $player->id,
        ]);

        TeamCache::flushTeam($team->id);

        return [
            'created' => true,
            'player' => $this->serializePlayer($player, true),
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
                $hasNameChanged = mb_strtolower((string) $player->name) !== mb_strtolower($name);
                if ($hasNameChanged) {
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
        }

        if (array_key_exists('number', $data)) {
            $number = ($data['number'] ?? null) !== null && $data['number'] !== '' ? (int) $data['number'] : null;

            if ($number !== null && $number > 0) {
                $hasNumberChanged = $player->number === null || (int) $player->number !== $number;
                if ($hasNumberChanged) {
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
                }
            } else {
                if ($player->number !== null) {
                    $update['number'] = null;
                }
            }
        }

        if (array_key_exists('position', $data)) {
            $update['position'] = $data['position'] ?: null;
        }

        if (array_key_exists('status', $data) && $data['status'] !== null) {
            $update['status'] = $data['status'];
        }

        if (array_key_exists('is_essential', $data)) {
            $update['is_essential'] = (bool) $data['is_essential'];
        }

        if (! empty($data['remove_photo'])) {
            if ($player->photo_path && Storage::disk('public')->exists($player->photo_path)) {
                Storage::disk('public')->delete($player->photo_path);
            }
            if ($player->photo_thumbnail_path && Storage::disk('public')->exists($player->photo_thumbnail_path)) {
                Storage::disk('public')->delete($player->photo_thumbnail_path);
            }
            $update['photo_path'] = null;
            $update['photo_thumbnail_path'] = null;
        } elseif (isset($data['photo']) && $data['photo'] instanceof UploadedFile && $this->images) {
            if ($player->photo_path && Storage::disk('public')->exists($player->photo_path)) {
                Storage::disk('public')->delete($player->photo_path);
            }
            if ($player->photo_thumbnail_path && Storage::disk('public')->exists($player->photo_thumbnail_path)) {
                Storage::disk('public')->delete($player->photo_thumbnail_path);
            }
            $stored = $this->images->storeWithThumbnail($data['photo'], 'players/photos');
            $update['photo_path'] = $stored['path'];
            $update['photo_thumbnail_path'] = $stored['thumbnail_path'];
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

    /**
     * Safely remove a player from the tournament squad or delete their record
     * if they have no match history.
     *
     * @return array{players: SupportCollection<int, array<string, mixed>>, squad_count: int, max: ?int}
     */
    public function removePlayer(Tournament $tournament, Team $team, Player $player): array
    {
        if ((int) $player->team_id !== (int) $team->id) {
            throw new DomainException('اللاعب غير موجود في هذا الفريق', 422);
        }

        // 1. Check if player has played in a finished match or is in an active match or approved lineup in this tournament
        $tournamentMatchIds = FootballMatch::query()
            ->where('competition_id', $tournament->competition_id)
            ->pluck('id');

        $inFinishedMatch = DB::table('match_lineups')
            ->join('matches', 'matches.id', '=', 'match_lineups.match_id')
            ->whereIn('match_lineups.match_id', $tournamentMatchIds)
            ->where('match_lineups.player_id', $player->id)
            ->where('matches.status', 'finished')
            ->exists();

        if ($inFinishedMatch) {
            throw new DomainException('لا يمكن حذف أو استبعاد اللاعب لأنه شارك في مباراة منتهية بالفعل في هذه البطولة', 422);
        }

        $inLiveMatch = DB::table('match_lineups')
            ->join('matches', 'matches.id', '=', 'match_lineups.match_id')
            ->whereIn('match_lineups.match_id', $tournamentMatchIds)
            ->where('match_lineups.player_id', $player->id)
            ->whereIn('matches.status', ['in_progress', 'first_half', 'second_half', 'halftime', 'extra_time', 'penalties'])
            ->exists();

        if ($inLiveMatch) {
            throw new DomainException('لا يمكن حذف أو استبعاد اللاعب أثناء سير مباراة جارية يشارك فيها', 422);
        }

        $inApprovedLineup = DB::table('match_lineups')
            ->join('matches', 'matches.id', '=', 'match_lineups.match_id')
            ->whereIn('match_lineups.match_id', $tournamentMatchIds)
            ->where('match_lineups.player_id', $player->id)
            ->where('matches.status', 'scheduled')
            ->where('match_lineups.is_starter', true)
            ->exists();

        if ($inApprovedLineup) {
            throw new DomainException('لا يمكن حذف اللاعب لأنه مدرج في تشكيلة أساسية معتمدة لمباراة قادمة في البطولة', 422);
        }

        // 2. Remove squad membership from this tournament
        TournamentSquadMember::query()
            ->where('tournament_id', $tournament->id)
            ->where('player_id', $player->id)
            ->delete();

        // Also clean up any unstarted scheduled lineups for this tournament
        DB::table('match_lineups')
            ->whereIn('match_id', $tournamentMatchIds)
            ->where('player_id', $player->id)
            ->delete();

        // 3. Check if player has match history across the platform
        $hasLineups = DB::table('match_lineups')->where('player_id', $player->id)->exists();
        $hasEvents = DB::table('match_events')
            ->where('player_id', $player->id)
            ->orWhere('assist_player_id', $player->id)
            ->exists();
        $otherSquads = TournamentSquadMember::query()->where('player_id', $player->id)->exists();

        // 4. If player has match history or is linked to an account or active in other squads:
        // DO NOT delete his history: deactivate/detach him from the team instead, keeping past matches, events and statistics intact.
        if ($hasLineups || $hasEvents || $otherSquads || ! $player->isManual()) {
            $player->update([
                'status' => Player::STATUS_UNAVAILABLE,
            ]);
        } else {
            // Player has no match history anywhere: delete cleanly
            if ($player->photo_path && Storage::disk('public')->exists($player->photo_path)) {
                Storage::disk('public')->delete($player->photo_path);
            }
            if ($player->photo_thumbnail_path && Storage::disk('public')->exists($player->photo_thumbnail_path)) {
                Storage::disk('public')->delete($player->photo_thumbnail_path);
            }
            $player->delete();
        }

        if ((int) $team->captain_id === (int) $player->id) {
            $team->update(['captain_id' => null]);
        }

        if ((int) $team->vice_captain_id === (int) $player->id) {
            $team->update(['vice_captain_id' => null]);
        }

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
            'status' => $player->status ?? Player::STATUS_ACTIVE,
            'is_essential' => (bool) $player->is_essential,
            'photo_url' => $player->photo_url,
            'photo_thumbnail_url' => $player->photo_thumbnail_url,
            'is_manual' => $player->isManual(),
            'in_squad' => $inSquad,
        ];
    }
}