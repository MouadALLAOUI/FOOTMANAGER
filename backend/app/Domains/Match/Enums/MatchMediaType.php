<?php

namespace App\Domains\Match\Enums;

enum MatchMediaType: string
{
    case Photo = 'photo';
    case Highlight = 'highlight';
    case Cover = 'cover';
    case Video = 'video';

    public static function allowed(): array
    {
        return array_map(fn (self $type) => $type->value, self::cases());
    }
}
