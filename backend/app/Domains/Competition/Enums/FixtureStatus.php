<?php

namespace App\Domains\Competition\Enums;

enum FixtureStatus: string
{
    case Scheduled = 'scheduled';
    case WaitingForBooking = 'waiting_for_booking';
    case ReschedulingRequired = 'rescheduling_required';
    case Postponed = 'postponed';
    case Cancelled = 'cancelled';
    case Played = 'played';
    case Bye = 'bye';

    public static function allowed(): array
    {
        return array_map(fn (self $status) => $status->value, self::cases());
    }
}
