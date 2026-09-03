<?php

namespace App\Domains\Match\Enums;

/**
 * Configurable punishment kinds attached to a `foul` match event.
 *
 * `none` means a plain foul (no disciplinary punishment). The remaining
 * values consolidate the former standalone card/penalty event types onto the
 * single `foul` entry point.
 */
enum MatchPunishment: string
{
    case None = 'none';
    case Yellow = 'yellow';
    case SecondYellow = 'second_yellow';
    case Red = 'red';
    case Penalty = 'penalty';

    /**
     * Whether this punishment implies the player is dismissed from the match.
     */
    public function isDismissal(): bool
    {
        return in_array($this, [self::SecondYellow, self::Red], true);
    }

    /**
     * Its unique icon token (mirrors the legacy card icons).
     */
    public function icon(): string
    {
        return match ($this) {
            self::None => 'foul',
            self::Yellow => 'yellow-card',
            self::SecondYellow => 'second-yellow',
            self::Red => 'red-card',
            self::Penalty => 'penalty',
        };
    }
}