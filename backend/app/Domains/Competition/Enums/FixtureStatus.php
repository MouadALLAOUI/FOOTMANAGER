<?php

namespace App\Domains\Competition\Enums;

enum FixtureStatus: string
{
    case Scheduled = 'scheduled';
    case Postponed = 'postponed';
    case Cancelled = 'cancelled';
    case Played = 'played';

    public static function allowed(): array
    {
        return array_map(fn (self $status) => $status->value, self::cases());
    }
}
