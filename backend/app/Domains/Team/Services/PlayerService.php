<?php

namespace App\Domains\Team\Services;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class PlayerService
{
    public function __construct(
        private PlayerStatisticsService $statistics,
    ) {}

    public function index(Team $team): array
    {
        $players = $team->players()
            ->orderBy('number')
            ->orderBy('name')
            ->get();

        $summaries = $this->statistics->summaries($team);

        return $players->map(function (Player $player) use ($summaries, $team) {
            $summary = $summaries[$player->id] ?? [];

            return $this->decorate($player, $team) + $summary;
        })->all();
    }

    public function store(Team $team, User $creator, array $data): array
    {
        if ($data['number'] !== null && $this->jerseyTaken($team, (int) $data['number'], null)) {
            throw ValidationException::withMessages(['number' => 'رقم القميص مستخدم بالفعل من قبل لاعب آخر']);
        }

        $player = $team->players()->create([
            'user_id' => $data['user_id'] ?? null,
            'name' => $data['name'],
            'position' => $data['position'] ?? $data['preferred_position'] ?? null,
            'preferred_position' => $data['preferred_position'] ?? null,
            'number' => $data['number'] ?? null,
            'phone' => $data['phone'] ?? null,
            'is_whatsapp' => $data['is_whatsapp'] ?? false,
            'role' => $data['role'] ?? Player::ROLE_RESERVE,
            'preferred_foot' => $data['preferred_foot'] ?? null,
            'height_cm' => $data['height_cm'] ?? null,
            'weight_kg' => $data['weight_kg'] ?? null,
            'status' => $data['status'] ?? Player::STATUS_ACTIVE,
            'emergency_contact' => $data['emergency_contact'] ?? null,
            'medical_notes' => $data['medical_notes'] ?? null,
            'joined_at' => $data['joined_at'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        $team->update(['member_count' => $team->players()->count()]);
        TeamCache::flushTeam($team->id);

        return $this->decorate($player, $team);
    }

    public function update(Team $team, Player $player, array $data): array
    {
        if (isset($data['number']) && $data['number'] !== $player->number && $this->jerseyTaken($team, (int) $data['number'], $player->id)) {
            throw ValidationException::withMessages(['number' => 'رقم القميص مستخدم بالفعل من قبل لاعب آخر']);
        }

        $player->update($data);

        if (array_key_exists('status', $data)) {
            $team->update(['member_count' => $team->players()->count()]);
        }

        TeamCache::flushTeam($team->id);

        return $this->decorate($player->fresh(), $team);
    }

    public function show(Team $team, Player $player): array
    {
        return $this->decorate($player, $team) + $this->statistics->forPlayer($player->id);
    }

    public function destroy(Team $team, Player $player): void
    {
        if ((int) $team->captain_id === (int) $player->id) {
            $team->update(['captain_id' => null]);
        }

        if ((int) $team->vice_captain_id === (int) $player->id) {
            $team->update(['vice_captain_id' => null]);
        }

        $player->delete();
        $team->update(['member_count' => $team->players()->count()]);
        TeamCache::flushTeam($team->id);
    }

    public function rules(bool $creating = true): array
    {
        $required = $creating ? 'required' : 'sometimes';

        return [
            'user_id' => 'sometimes|nullable|exists:users,id',
            'name' => "{$required}|string|max:255",
            'position' => 'sometimes|nullable|string|max:100',
            'preferred_position' => 'sometimes|nullable|string|max:100',
            'number' => 'sometimes|nullable|integer|min:0|max:99',
            'phone' => 'sometimes|nullable|string|max:20',
            'is_whatsapp' => 'sometimes|boolean',
            'role' => 'sometimes|in:starter,substitute,reserve',
            'preferred_foot' => 'sometimes|nullable|in:left,right,both',
            'height_cm' => 'sometimes|nullable|integer|min:100|max:230',
            'weight_kg' => 'sometimes|nullable|integer|min:30|max:200',
            'status' => 'sometimes|in:active,suspended,injured,unavailable',
            'emergency_contact' => 'sometimes|nullable|string|max:255',
            'medical_notes' => 'sometimes|nullable|string|max:1000',
            'joined_at' => 'sometimes|nullable|date',
            'notes' => 'sometimes|nullable|string|max:500',
        ];
    }

    private function decorate(Player $player, Team $team): array
    {
        $role = 'reserve';

        if ((int) $team->captain_id === (int) $player->id) {
            $role = 'captain';
        } elseif ((int) $team->vice_captain_id === (int) $player->id) {
            $role = 'vice_captain';
        } else {
            $role = $player->role ?? Player::ROLE_RESERVE;
        }

        return $player->toArray() + ['effective_role' => $role];
    }

    private function jerseyTaken(Team $team, int $number, ?int $exceptId): bool
    {
        if ($number <= 0) {
            return false;
        }

        return $team->players()
            ->where('number', $number)
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->exists();
    }
}
