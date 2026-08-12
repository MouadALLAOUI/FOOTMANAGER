<?php

namespace App\Domains\Match\Enums;

enum MatchPeriod: string
{
    case FirstHalf = 'first_half';
    case SecondHalf = 'second_half';
    case ExtraFirstHalf = 'extra_first_half';
    case ExtraSecondHalf = 'extra_second_half';
    case Penalties = 'penalties';

    public function label(): string
    {
        return match ($this) {
            self::FirstHalf => '1st Half',
            self::SecondHalf => '2nd Half',
            self::ExtraFirstHalf => 'Extra Time 1st Half',
            self::ExtraSecondHalf => 'Extra Time 2nd Half',
            self::Penalties => 'Penalties',
        };
    }
}
