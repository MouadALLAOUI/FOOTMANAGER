<?php

namespace App\Domains\Tournament\Models;

use App\Domains\Shared\Base\Model;
use App\Domains\Stadium\Models\Stadium;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TournamentStadium extends Model
{
    protected $fillable = [
        'tournament_id',
        'stadium_id',
    ];

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function stadium(): BelongsTo
    {
        return $this->belongsTo(Stadium::class);
    }
}
