<?php

namespace App\Domains\Social\Models;

use App\Domains\Shared\Base\Model;

class SearchHistory extends Model
{
    protected $fillable = [
        'user_id',
        'query',
    ];
}
