<?php

namespace App\Domains\Team\Services;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Support\TeamCache;
use App\Domains\Team\Events\FormationUpdated;
use App\Domains\Team\Models\Team;
use App\Domains\Team\Models\TeamFormation;
use Illuminate\Validation\ValidationException;

class TeamFormationService
{
    public function get(Team $team): TeamFormation
    {
        $formation = $team->formation()->with(['captain:id,name,number', 'viceCaptain:id,name,number'])->first();

        if ($formation) {
            return $formation;
        }

        return new TeamFormation([
            'team_id' => $team->id,
            'name' => 'الخطة الأساسية',
            'format' => $this->defaultFormat($team),
            'formation' => null,
            'positions' => [],
            'bench' => [],
            'substitutes' => [],
            'captain_id' => $team->captain_id,
            'vice_captain_id' => $team->vice_captain_id,
            'is_active' => true,
        ]);
    }

    public function save(Team $team, array $data): TeamFormation
    {
        $playerIds = array_filter(array_merge(
            array_column($data['positions'] ?? [], 'player_id'),
            $data['bench'] ?? [],
            $data['substitutes'] ?? [],
        ));

        if ($playerIds) {
            $valid = Player::where('team_id', $team->id)->whereIn('id', $playerIds)->pluck('id')->all();

            if (count(array_diff($playerIds, $valid)) > 0) {
                $this->throwInvalidPlayers();
            }
        }

        $formation = $team->formation()->first();

        $values = [
            'team_id' => $team->id,
            'name' => $data['name'] ?? 'الخطة الأساسية',
            'format' => $data['format'] ?? null,
            'formation' => $data['formation'] ?? null,
            'positions' => $data['positions'] ?? [],
            'bench' => $data['bench'] ?? [],
            'substitutes' => $data['substitutes'] ?? [],
            'is_active' => true,
        ];

        if ($formation) {
            $formation->update($values);
        } else {
            $formation = TeamFormation::create($values);
        }

        $captainId = $data['captain_id'] ?? $team->captain_id;
        $viceCaptainId = $data['vice_captain_id'] ?? $team->vice_captain_id;

        if ($captainId || $viceCaptainId) {
            $team->update([
                'captain_id' => $captainId ?: $team->captain_id,
                'vice_captain_id' => $viceCaptainId ?: $team->vice_captain_id,
            ]);
        }

        TeamCache::flushTeam($team->id);

        event(new FormationUpdated($team, $formation));

        return $formation->load(['captain:id,name,number', 'viceCaptain:id,name,number']);
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|nullable|string|max:255',
            'format' => 'sometimes|nullable|in:5v5,7v7,11v11',
            'formation' => 'sometimes|nullable|string|max:20',
            'positions' => 'sometimes|nullable|array',
            'positions.*.player_id' => 'integer',
            'positions.*.key' => 'string|max:10',
            'positions.*.x' => 'numeric|min:0|max:100',
            'positions.*.y' => 'numeric|min:0|max:100',
            'bench' => 'sometimes|nullable|array',
            'bench.*' => 'integer',
            'substitutes' => 'sometimes|nullable|array',
            'substitutes.*' => 'integer',
            'captain_id' => 'sometimes|nullable|integer',
            'vice_captain_id' => 'sometimes|nullable|integer',
        ];
    }

    private function defaultFormat(Team $team): ?string
    {
        $formats = $team->preferred_formats ?? [];

        return in_array('11v11', $formats, true) ? '11v11'
            : (in_array('7v7', $formats, true) ? '7v7'
                : (in_array('5v5', $formats, true) ? '5v5' : null));
    }

    private function throwInvalidPlayers(): void
    {
        throw ValidationException::withMessages([
            'positions' => 'بعض اللاعبين غير موجودين في الفريق',
        ]);
    }
}
