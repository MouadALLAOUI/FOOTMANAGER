<?php

namespace App\Domains\Social\Models;

use App\Domains\Shared\Base\Model;

class SearchTerm extends Model
{
    protected $fillable = [
        'term',
        'count',
    ];

    protected function casts(): array
    {
        return [
            'count' => 'integer',
        ];
    }
}
