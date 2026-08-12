<?php

namespace App\Domains\Competition\Enums;

enum RoundStage: string
{
    case Group = 'group';
    case RoundOf16 = 'round_of_16';
    case Quarterfinal = 'quarterfinal';
    case Semifinal = 'semifinal';
    case Final = 'final';

    public static function allowed(): array
    {
        return array_map(fn (self $stage) => $stage->value, self::cases());
    }
}
