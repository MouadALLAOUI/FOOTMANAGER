<?php

namespace App\Domains\Competition\Enums;

enum CompetitionType: string
{
    case League = 'league';
    case Cup = 'cup';
    case Friendly = 'friendly';

    public static function allowed(): array
    {
        return array_map(fn (self $type) => $type->value, self::cases());
    }
}
