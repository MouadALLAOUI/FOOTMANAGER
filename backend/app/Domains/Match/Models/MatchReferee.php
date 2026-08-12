<?php

namespace App\Domains\Match\Models;

use App\Domains\Shared\Base\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchReferee extends Model
{
    protected $fillable = [
        'match_id',
        'referee_id',
        'role',
    ];

    public function match(): BelongsTo
    {
        return $this->belongsTo(FootballMatch::class, 'match_id');
    }

    public function referee(): BelongsTo
    {
        return $this->belongsTo(Referee::class, 'referee_id');
    }
}
