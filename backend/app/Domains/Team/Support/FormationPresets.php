<?php

namespace App\Domains\Team\Support;

use App\Domains\Match\Services\LineupService;

/**
 * Tactical arrangement presets per football format.
 *
 * A preset describes structure only (no players). Slots use normalized
 * coordinates (x/y 0.0 - 1.0) where y=0 is the team's own goal line,
 * so a formation renders identically on any screen size.
 */
class FormationPresets
{
    public const POSITION_ROLES = [
        'GK' => 'goalkeeper',
        'CB' => 'defender',
        'LB' => 'defender',
        'RB' => 'defender',
        'DM' => 'midfielder',
        'CM' => 'midfielder',
        'AM' => 'midfielder',
        'LM' => 'midfielder',
        'RM' => 'midfielder',
        'LW' => 'forward',
        'RW' => 'forward',
        'ST' => 'forward',
        'CF' => 'forward',
    ];

    private static array $presets = [
        '5v5' => [
            ['key' => '5v5_2_2', 'label' => '2-2', 'slots' => [
                ['GK', 0.5, 0.10], ['CB', 0.30, 0.38], ['CB', 0.70, 0.38], ['ST', 0.30, 0.75], ['ST', 0.70, 0.75],
            ]],
            ['key' => '5v5_2_1_1', 'label' => '2-1-1', 'slots' => [
                ['GK', 0.5, 0.10], ['CB', 0.28, 0.35], ['CB', 0.72, 0.35], ['CM', 0.5, 0.58], ['ST', 0.5, 0.82],
            ]],
            ['key' => '5v5_1_2_1', 'label' => '1-2-1', 'slots' => [
                ['GK', 0.5, 0.10], ['CB', 0.5, 0.32], ['CM', 0.30, 0.60], ['CM', 0.70, 0.60], ['ST', 0.5, 0.84],
            ]],
            ['key' => '5v5_3_1', 'label' => '3-1', 'slots' => [
                ['GK', 0.5, 0.10], ['CB', 0.22, 0.36], ['CB', 0.5, 0.30], ['CB', 0.78, 0.36], ['ST', 0.5, 0.75],
            ]],
        ],
        '7v7' => [
            ['key' => '7v7_3_2_1', 'label' => '3-2-1', 'slots' => [
                ['GK', 0.5, 0.08], ['CB', 0.22, 0.30], ['CB', 0.5, 0.26], ['CB', 0.78, 0.30], ['CM', 0.32, 0.58], ['CM', 0.68, 0.58], ['ST', 0.5, 0.82],
            ]],
            ['key' => '7v7_2_3_1', 'label' => '2-3-1', 'slots' => [
                ['GK', 0.5, 0.08], ['CB', 0.32, 0.30], ['CB', 0.68, 0.30], ['CM', 0.22, 0.55], ['CM', 0.5, 0.50], ['CM', 0.78, 0.55], ['ST', 0.5, 0.82],
            ]],
            ['key' => '7v7_3_1_2', 'label' => '3-1-2', 'slots' => [
                ['GK', 0.5, 0.08], ['CB', 0.22, 0.30], ['CB', 0.5, 0.26], ['CB', 0.78, 0.30], ['CM', 0.5, 0.55], ['ST', 0.32, 0.80], ['ST', 0.68, 0.80],
            ]],
            ['key' => '7v7_2_2_2', 'label' => '2-2-2', 'slots' => [
                ['GK', 0.5, 0.08], ['CB', 0.32, 0.30], ['CB', 0.68, 0.30], ['CM', 0.32, 0.58], ['CM', 0.68, 0.58], ['ST', 0.32, 0.82], ['ST', 0.68, 0.82],
            ]],
        ],
        '8v8' => [
            ['key' => '8v8_3_2_2', 'label' => '3-2-2', 'slots' => [
                ['GK', 0.5, 0.08], ['CB', 0.22, 0.28], ['CB', 0.5, 0.24], ['CB', 0.78, 0.28], ['CM', 0.35, 0.55], ['CM', 0.65, 0.55], ['ST', 0.32, 0.82], ['ST', 0.68, 0.82],
            ]],
            ['key' => '8v8_2_3_2', 'label' => '2-3-2', 'slots' => [
                ['GK', 0.5, 0.08], ['CB', 0.32, 0.28], ['CB', 0.68, 0.28], ['CM', 0.22, 0.52], ['CM', 0.5, 0.48], ['CM', 0.78, 0.52], ['ST', 0.32, 0.82], ['ST', 0.68, 0.82],
            ]],
            ['key' => '8v8_4_2_1', 'label' => '4-2-1', 'slots' => [
                ['GK', 0.5, 0.08], ['LB', 0.18, 0.28], ['CB', 0.39, 0.24], ['CB', 0.61, 0.24], ['RB', 0.82, 0.28], ['CM', 0.35, 0.55], ['CM', 0.65, 0.55], ['ST', 0.5, 0.82],
            ]],
        ],
        '11v11' => [
            ['key' => '11v11_4_3_3', 'label' => '4-3-3', 'slots' => [
                ['GK', 0.5, 0.06], ['LB', 0.16, 0.24], ['CB', 0.38, 0.20], ['CB', 0.62, 0.20], ['RB', 0.84, 0.24], ['CM', 0.28, 0.50], ['CM', 0.5, 0.45], ['CM', 0.72, 0.50], ['LW', 0.22, 0.78], ['ST', 0.5, 0.82], ['RW', 0.78, 0.78],
            ]],
            ['key' => '11v11_4_4_2', 'label' => '4-4-2', 'slots' => [
                ['GK', 0.5, 0.06], ['LB', 0.16, 0.24], ['CB', 0.38, 0.20], ['CB', 0.62, 0.20], ['RB', 0.84, 0.24], ['LM', 0.18, 0.52], ['CM', 0.40, 0.48], ['CM', 0.60, 0.48], ['RM', 0.82, 0.52], ['ST', 0.38, 0.80], ['ST', 0.62, 0.80],
            ]],
            ['key' => '11v11_3_5_2', 'label' => '3-5-2', 'slots' => [
                ['GK', 0.5, 0.06], ['CB', 0.28, 0.22], ['CB', 0.5, 0.18], ['CB', 0.72, 0.22], ['LM', 0.14, 0.50], ['CM', 0.32, 0.45], ['CM', 0.5, 0.42], ['CM', 0.68, 0.45], ['RM', 0.86, 0.50], ['ST', 0.38, 0.80], ['ST', 0.62, 0.80],
            ]],
            ['key' => '11v11_4_2_3_1', 'label' => '4-2-3-1', 'slots' => [
                ['GK', 0.5, 0.06], ['LB', 0.16, 0.24], ['CB', 0.38, 0.20], ['CB', 0.62, 0.20], ['RB', 0.84, 0.24], ['DM', 0.38, 0.42], ['DM', 0.62, 0.42], ['LW', 0.22, 0.62], ['AM', 0.5, 0.58], ['RW', 0.78, 0.62], ['ST', 0.5, 0.85],
            ]],
        ],
    ];

    /**
     * All presets, grouped per format. Formats without presets are omitted.
     */
    public static function all(): array
    {
        $presets = [];

        foreach (self::$presets as $format => $formatPresets) {
            $presets[$format] = array_map(
                fn (array $preset) => self::formatPreset($format, $preset),
                $formatPresets,
            );
        }

        return $presets;
    }

    public static function forFormat(string $format): array
    {
        return self::all()[$format] ?? [];
    }

    public static function find(?string $key): ?array
    {
        if (! $key) {
            return null;
        }

        foreach (self::all() as $formatPresets) {
            foreach ($formatPresets as $preset) {
                if ($preset['key'] === $key) {
                    return $preset;
                }
            }
        }

        return null;
    }

    public static function existsForFormat(string $format, ?string $key): bool
    {
        if (! $key) {
            return true;
        }

        return collect(self::forFormat($format))->contains('key', $key);
    }

    public static function validPositions(): array
    {
        return array_keys(self::POSITION_ROLES);
    }

    public static function roleFor(string $tacticalPosition): ?string
    {
        return self::POSITION_ROLES[$tacticalPosition] ?? null;
    }

    /**
     * Formats the application supports for formations. Sourced from the same
     * place match lineups derive starter counts so the two can never diverge.
     */
    public static function formats(): array
    {
        return ['5v5', '7v7', '8v8', '11v11'];
    }

    public static function startersForFormat(string $format): int
    {
        return LineupService::startersRequired($format);
    }

    private static function formatPreset(string $format, array $preset): array
    {
        return [
            'key' => $preset['key'],
            'label' => $preset['label'],
            'format' => $format,
            'slots' => array_map(
                fn (array $slot, int $index) => [
                    'slot_index' => $index,
                    'tactical_position' => $slot[0],
                    'role' => self::POSITION_ROLES[$slot[0]],
                    'x' => $slot[1],
                    'y' => $slot[2],
                ],
                $preset['slots'],
                array_keys($preset['slots']),
            ),
        ];
    }
}
