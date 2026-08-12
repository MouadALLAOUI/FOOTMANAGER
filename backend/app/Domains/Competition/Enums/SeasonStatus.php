<?php

namespace App\Domains\Competition\Enums;

enum SeasonStatus: string
{
    case Upcoming = 'upcoming';
    case Active = 'active';
    case Finished = 'finished';
    case Cancelled = 'cancelled';

    public static function allowed(): array
    {
        return array_map(fn (self $status) => $status->value, self::cases());
    }
}
