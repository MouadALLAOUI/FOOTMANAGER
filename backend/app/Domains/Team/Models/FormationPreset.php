<?php

namespace App\Domains\Team\Models;

use App\Domains\Team\Support\FormationPresets;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A manager-editable formation preset (structure only — no players).
 *
 * Built-in catalog presets ship from FormationPresets and are NOT stored
 * here; this table only persists presets created/renamed/deleted by managers.
 */
class FormationPreset extends Model
{
    use HasFactory;

    protected $fillable = [
        'team_id',
        'name',
        'format',
        'slots',
    ];

    protected function casts(): array
    {
        return [
            'slots' => 'array',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
    }

    /**
     * Same structure as FormationPresets::formatPreset() so the API shape
     * stays identical whether a preset is built-in or manager-created.
     */
    public function toPreset(): array
    {
        $slots = $this->slots ?? [];

        return [
            'key' => 'custom:'.$this->id,
            'label' => $this->name,
            'format' => $this->format,
            'custom' => true,
            'slots' => array_map(
                fn (array $slot, int $index) => [
                    'slot_index' => $index,
                    'tactical_position' => $slot[0],
                    'role' => FormationPresets::roleFor($slot[0]),
                    'x' => (float) $slot[1],
                    'y' => (float) $slot[2],
                ],
                $slots,
                array_keys($slots),
            ),
        ];
    }

    public function matchesFormat(string $format): bool
    {
        return (string) $this->format === $format;
    }

    public function isOwnedBy(int $teamId): bool
    {
        return $this->team_id !== null && (int) $this->team_id === $teamId;
    }
}