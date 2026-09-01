<?php

namespace App\Domains\Shared\Support;

/**
 * Arabic pluralization for counted nouns. The three main cases follow the
 * standard rules: 1 -> singular, 2 -> dual, 3–10 -> plural (genitive),
 * 11+ -> singular accusative with the number spelled out.
 */
final class ArabicPlural
{
    public static function players(int $count): string
    {
        if ($count === 1) {
            return 'لاعب واحد';
        }

        if ($count === 2) {
            return 'لاعبان';
        }

        if ($count >= 3 && $count <= 10) {
            return "{$count} لاعبين";
        }

        return "{$count} لاعباً";
    }
}