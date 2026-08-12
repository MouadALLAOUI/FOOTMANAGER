<?php

namespace App\Domains\Match\Enums;

enum MatchStatus: string
{
    case Scheduled = 'scheduled';
    case Warmup = 'warmup';
    case Kickoff = 'kickoff';
    case FirstHalf = 'first_half';
    case Halftime = 'halftime';
    case SecondHalf = 'second_half';
    case ExtraTime = 'extra_time';
    case Penalties = 'penalties';
    case Finished = 'finished';
    case Cancelled = 'cancelled';
    case Postponed = 'postponed';

    public static function live(): array
    {
        return [
            self::Kickoff->value,
            self::FirstHalf->value,
            self::Halftime->value,
            self::SecondHalf->value,
            self::ExtraTime->value,
            self::Penalties->value,
        ];
    }

    public function isLive(): bool
    {
        return in_array($this->value, self::live(), true);
    }
}
