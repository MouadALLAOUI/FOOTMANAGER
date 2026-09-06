<?php

namespace App\Domains\Team\Services;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Events\FormationUpdated;
use App\Domains\Team\Models\FormationPlayer;
use App\Domains\Team\Models\FormationPreset;
use App\Domains\Team\Models\Team;
use App\Domains\Team\Models\TeamFormation;
use App\Domains\Team\Support\FormationPresets;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TeamFormationService
{
    /** Role holder columns persisted on team_formations. */
    public const ROLE_FIELDS = [
        'captain_id',
        'vice_captain_id',
        'free_kick_taker_id',
        'penalty_taker_id',
        'corner_taker_id',
    ];

    private const ROLE_LABELS = [
        'captain_id' => 'القائد',
        'vice_captain_id' => 'نائب القائد',
        'free_kick_taker_id' => 'لاعب الركلات الحرة',
        'penalty_taker_id' => 'لاعب ركلات الجزاء',
        'corner_taker_id' => 'لاعب الركنيات',
    ];
    public function list(Team $team, ?int $tournamentId = null): array
    {
        return TeamFormation::query()
            ->where('team_id', $team->id)
            ->when($tournamentId, fn ($q) => $q->where('tournament_id', $tournamentId), fn ($q) => $q->whereNull('tournament_id'))
            ->with(['players.player:id,name,position,team_id,number'])
            ->orderByDesc('is_active')
            ->orderByDesc('updated_at')
            ->get()
            ->all();
    }

    public function get(Team $team): TeamFormation
    {
        $formation = $team->formation()->with(['players.player:id,name,position,team_id,number', 'captain:id,name,number', 'viceCaptain:id,name,number'])->first();

        if ($formation) {
            return $formation;
        }

        return new TeamFormation([
            'team_id' => $team->id,
            'name' => 'الخطة الأساسية',
            'format' => $this->defaultFormat($team),
            'formation' => null,
            'preset_key' => null,
            'captain_id' => $team->captain_id,
            'vice_captain_id' => $team->vice_captain_id,
            'is_active' => true,
        ]);
    }

    public function find(Team $team, int $formationId): TeamFormation
    {
        return TeamFormation::query()
            ->where('team_id', $team->id)
            ->with(['players.player:id,name,position,team_id,number', 'captain:id,name,number', 'viceCaptain:id,name,number'])
            ->findOrFail($formationId);
    }

    public function create(Team $team, array $data): TeamFormation
    {
        return $this->persist($team, null, $data);
    }

    public function update(Team $team, TeamFormation $formation, array $data): TeamFormation
    {
        return $this->persist($team, $formation, $data);
    }

    /**
     * Legacy single-formation API: upserts the team's active formation.
     */
    public function save(Team $team, array $data): TeamFormation
    {
        $formation = $team->formation()->first();

        $payload = [
            'name' => $data['name'] ?? 'الخطة الأساسية',
            'format' => $data['format'] ?? $this->defaultFormat($team) ?? '5v5',
            'formation' => $data['formation'] ?? null,
            'players' => $this->normalizeLegacyPlayers($data),
            'captain_id' => $data['captain_id'] ?? null,
            'vice_captain_id' => $data['vice_captain_id'] ?? null,
            'free_kick_taker_id' => $data['free_kick_taker_id'] ?? null,
            'penalty_taker_id' => $data['penalty_taker_id'] ?? null,
            'corner_taker_id' => $data['corner_taker_id'] ?? null,
            'is_active' => true,
        ];

        return $this->persist($team, $formation, $payload);
    }

    public function delete(Team $team, TeamFormation $formation): void
    {
        DB::transaction(function () use ($team, $formation) {
            $formation->players()->delete();
            $formation->delete();
            TeamCache::flushTeam($team->id);
        });
    }

    public function activate(Team $team, TeamFormation $formation): TeamFormation
    {
        return DB::transaction(function () use ($team, $formation) {
            TeamFormation::query()
                ->where('team_id', $team->id)
                ->where('id', '!=', $formation->id)
                ->where('is_active', true)
                ->when($formation->tournament_id, fn ($q) => $q->where('tournament_id', $formation->tournament_id), fn ($q) => $q->whereNull('tournament_id'))
                ->update(['is_active' => false]);

            $formation->update(['is_active' => true]);
            TeamCache::flushTeam($team->id);

            return $formation->fresh(['players.player:id,name,position,team_id,number', 'captain:id,name,number', 'viceCaptain:id,name,number']);
        });
    }

    public function presets(?int $teamId): array
    {
        $groups = FormationPresets::all();

        if ($teamId) {
            foreach (FormationPreset::query()->where('team_id', $teamId)->orderBy('name')->get() as $preset) {
                $groups[$preset->format][] = $preset->toPreset();
            }
        }

        return array_filter($groups, fn (array $presets) => $presets !== []);
    }

    // ── Custom preset management (structure-only, per team) ──────────

    public function createPreset(Team $team, array $data): FormationPreset
    {
        $format = (string) $data['format'];

        if (! in_array($format, FormationPresets::formats(), true)) {
            throw ValidationException::withMessages([
                'format' => 'صيغة اللعب غير مدعومة',
            ]);
        }

        return FormationPreset::create([
            'team_id' => $team->id,
            'name' => (string) $data['name'],
            'format' => $format,
            'slots' => $this->normalizePresetSlots($format, $data['slots'] ?? []),
        ]);
    }

    public function updatePreset(Team $team, int $presetId, array $data): FormationPreset
    {
        $preset = $this->presetFor($team, $presetId);

        $preset->update([
            'name' => (string) ($data['name'] ?? $preset->name),
            'slots' => $data['slots'] ?? []
                ? $this->normalizePresetSlots($preset->format, $data['slots'])
                : $preset->slots,
        ]);

        return $preset;
    }

    public function deletePreset(Team $team, int $presetId): void
    {
        $this->presetFor($team, $presetId)->delete();
    }

    public function presetFor(Team $team, int $presetId): FormationPreset
    {
        return FormationPreset::query()
            ->where('team_id', $team->id)
            ->findOrFail($presetId);
    }

    /**
     * Legacy payload rules for the single-formation PUT endpoint.
     */
    public function rules(): array
    {
        return [
            'name' => 'sometimes|nullable|string|max:255',
            'format' => 'sometimes|nullable|in:'.implode(',', FormationPresets::formats()),
            'formation' => 'sometimes|nullable|string|max:20',
            'positions' => 'sometimes|nullable|array',
            'positions.*.player_id' => 'required|integer',
            'positions.*.key' => 'nullable|string|max:10',
            'positions.*.x' => 'required|numeric|min:0|max:100',
            'positions.*.y' => 'required|numeric|min:0|max:100',
            'bench' => 'sometimes|nullable|array',
            'bench.*' => 'integer',
            'substitutes' => 'sometimes|nullable|array',
            'substitutes.*' => 'integer',
            'captain_id' => 'sometimes|nullable|integer',
            'vice_captain_id' => 'sometimes|nullable|integer',
            'free_kick_taker_id' => 'sometimes|nullable|integer',
            'penalty_taker_id' => 'sometimes|nullable|integer',
            'corner_taker_id' => 'sometimes|nullable|integer',
        ];
    }

    private function persist(Team $team, ?TeamFormation $formation, array $data): TeamFormation
    {
        $format = (string) ($data['format'] ?? $formation?->format);
        $players = $data['players'] ?? [];

        if (! in_array($format, FormationPresets::formats(), true)) {
            throw ValidationException::withMessages([
                'format' => 'صيغة اللعب غير مدعومة',
            ]);
        }

        $this->validatePreset($team, $format, $data['preset_key'] ?? null);
        $this->validateAssignments($team, $format, $players);
        $this->validateRoleHolders($team, $data);

        $starterIds = array_map(
            'intval',
            array_column(array_filter($players, fn (array $entry) => (bool) ($entry['is_starter'] ?? false)), 'player_id'),
        );

        $formation = DB::transaction(function () use ($team, $formation, $data, $format, $players, $starterIds) {
            $values = [
                'team_id' => $team->id,
                'name' => $data['name'],
                'format' => $format,
                'formation' => $data['formation'] ?? null,
                'preset_key' => $data['preset_key'] ?? null,
                'is_active' => (bool) ($data['is_active'] ?? false),
            ];

            // Role holders must be on the pitch: a holder moved to the bench
            // (or omitted) is cleared automatically instead of erroring out.
            foreach (self::ROLE_FIELDS as $field) {
                $values[$field] = $this->roleIfStarter($data, $field, $starterIds);
            }

            if ($formation) {
                $formation->update($values);
                $formation->players()->delete();
            } else {
                $formation = TeamFormation::create($values);
            }

            $this->createAssignments($formation, $players);

            if ($formation->is_active) {
                TeamFormation::query()
                    ->where('team_id', $team->id)
                    ->where('id', '!=', $formation->id)
                    ->where('is_active', true)
                    ->update(['is_active' => false]);
            }

            TeamCache::flushTeam($team->id);

            return $formation;
        });

        event(new FormationUpdated($team, $formation));

        return $formation->load(['players.player:id,name,position,team_id,number', 'captain:id,name,number', 'viceCaptain:id,name,number']);
    }

    private function createAssignments(TeamFormation $formation, array $players): void
    {
        foreach (array_values($players) as $index => $entry) {
            $isStarter = (bool) $entry['is_starter'];
            $tacticalPosition = $isStarter ? ($entry['tactical_position'] ?? null) : null;

            FormationPlayer::create([
                'formation_id' => $formation->id,
                'player_id' => $entry['player_id'],
                'tactical_position' => $tacticalPosition,
                'role' => $tacticalPosition ? FormationPresets::roleFor($tacticalPosition) : null,
                'x' => $isStarter ? $entry['x'] : null,
                'y' => $isStarter ? $entry['y'] : null,
                'is_starter' => $isStarter,
                'sort_order' => $entry['sort_order'] ?? $index,
            ]);
        }
    }

    private function validatePreset(Team $team, string $format, ?string $presetKey): void
    {
        if (! $presetKey) {
            return;
        }

        if (str_starts_with($presetKey, 'custom:')) {
            $id = (int) substr($presetKey, 7);

            if (! FormationPreset::query()->where('team_id', $team->id)->whereKey($id)->exists()) {
                throw ValidationException::withMessages([
                    'preset_key' => 'الخطة التكتيكية المحددة غير متوفرة لصيغة '.$format,
                ]);
            }

            return;
        }

        if (! FormationPresets::existsForFormat($format, $presetKey)) {
            throw ValidationException::withMessages([
                'preset_key' => 'الخطة التكتيكية المحددة غير متوفرة لصيغة '.$format,
            ]);
        }
    }

    private function validateAssignments(Team $team, string $format, array $players): void
    {
        $playerIds = array_column($players, 'player_id');

        if (count($playerIds) !== count(array_unique($playerIds))) {
            throw ValidationException::withMessages([
                'players' => 'لا يمكن تكرار نفس اللاعب في التشكيلة',
            ]);
        }

        if ($playerIds) {
            $memberIds = Player::query()
                ->where('team_id', $team->id)
                ->whereIn('id', $playerIds)
                ->pluck('id')
                ->all();

            $foreign = array_diff($playerIds, $memberIds);

            if ($foreign) {
                throw ValidationException::withMessages([
                    'players' => 'بعض اللاعبين غير موجودين في الفريق',
                ]);
            }
        }

        $maxStarters = FormationPresets::startersForFormat($format);
        $starterCount = count(array_filter($players, fn (array $entry) => (bool) ($entry['is_starter'] ?? false)));

        if ($starterCount > $maxStarters) {
            throw ValidationException::withMessages([
                'players' => "لا يمكن تعيين أكثر من {$maxStarters} لاعبين أساسيين لصيغة {$format}",
            ]);
        }

        foreach ($players as $index => $entry) {
            if (! ($entry['is_starter'] ?? false)) {
                continue;
            }

            foreach (['tactical_position', 'x', 'y'] as $field) {
                if (! isset($entry[$field]) || $entry[$field] === null || $entry[$field] === '') {
                    throw ValidationException::withMessages([
                        "players.{$index}.{$field}" => 'اللاعبون الأساسيون يحتاجون مركزاً تكتيكياً وإحداثيات صالحة',
                    ]);
                }

                if ($field !== 'tactical_position' && ((float) $entry[$field] < 0.0 || (float) $entry[$field] > 1.0)) {
                    throw ValidationException::withMessages([
                        "players.{$index}.{$field}" => 'إحداثيات اللاعب يجب أن تكون بين 0.0 و 1.0',
                    ]);
                }
            }

            if (FormationPresets::roleFor($entry['tactical_position']) === null) {
                throw ValidationException::withMessages([
                    "players.{$index}.tactical_position" => 'المركز التكتيكي غير صالح',
                ]);
            }
        }
    }

    private function validateRoleHolders(Team $team, array $data): void
    {
        $roleIds = [];
        foreach (self::ROLE_FIELDS as $field) {
            if (! $data[$field]) {
                continue;
            }

            $roleIds[$field] = (int) $data[$field];
        }

        if (! $roleIds) {
            return;
        }

        $memberIds = Player::query()
            ->where('team_id', $team->id)
            ->whereIn('id', array_values($roleIds))
            ->pluck('id')
            ->all();

        foreach ($roleIds as $field => $playerId) {
            if (! in_array($playerId, $memberIds, true)) {
                throw ValidationException::withMessages([
                    $field => self::ROLE_LABELS[$field].' يجب أن يكون من أعضاء الفريق',
                ]);
            }
        }
    }

    /**
     * Returns the role holder id only when the player is part of the starting
     * XI; otherwise clears it so the stored formation never holds bench roles.
     */
    private function roleIfStarter(array $data, string $field, array $starterIds): ?int
    {
        $playerId = isset($data[$field]) ? (int) $data[$field] : null;

        return $playerId && in_array($playerId, $starterIds, true) ? $playerId : null;
    }

    private function normalizePresetSlots(string $format, array $slots): array
    {
        $required = FormationPresets::startersForFormat($format);

        if (count($slots) !== $required) {
            throw ValidationException::withMessages([
                'slots' => "يجب أن تتضمن الخطة المحفوظة {$required} مواقع محددة لصيغة {$format}",
            ]);
        }

        $normalized = [];

        foreach ($slots as $index => $slot) {
            $position = $slot['tactical_position'] ?? null;

            if (FormationPresets::roleFor((string) $position) === null) {
                throw ValidationException::withMessages([
                    "slots.{$index}.tactical_position" => 'المركز التكتيكي غير صالح',
                ]);
            }

            $x = max(0.0, min(1.0, (float) ($slot['x'] ?? 0)));
            $y = max(0.0, min(1.0, (float) ($slot['y'] ?? 0)));

            $normalized[] = [$position, round($x, 3), round($y, 3)];
        }

        return $normalized;
    }

    private function normalizeLegacyPlayers(array $data): array
    {
        $players = [];

        foreach ($data['positions'] ?? [] as $entry) {
            $players[$entry['player_id']] = [
                'player_id' => $entry['player_id'],
                'is_starter' => true,
                'tactical_position' => $entry['key'] ?? null,
                'x' => isset($entry['x']) ? max(0.0, min(1.0, $entry['x'] / 100)) : null,
                'y' => isset($entry['y']) ? max(0.0, min(1.0, $entry['y'] / 100)) : null,
            ];
        }

        foreach (array_merge($data['bench'] ?? [], $data['substitutes'] ?? []) as $playerId) {
            $players[$playerId] = [
                'player_id' => $playerId,
                'is_starter' => false,
                'tactical_position' => null,
                'x' => null,
                'y' => null,
            ];
        }

        return array_values($players);
    }

    private function defaultFormat(Team $team): ?string
    {
        $formats = $team->preferred_formats ?? [];

        return collect(FormationPresets::formats())
            ->reverse()
            ->first(fn (string $format) => in_array($format, $formats, true));
    }
}
