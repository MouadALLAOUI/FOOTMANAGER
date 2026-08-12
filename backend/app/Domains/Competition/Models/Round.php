<?php

namespace App\Domains\Competition\Models;

use App\Domains\Competition\Enums\RoundStage;
use App\Domains\Shared\Base\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Round extends Model
{
    protected $fillable = [
        'competition_id',
        'season_id',
        'name',
        'stage',
        'order_index',
    ];

    protected function casts(): array
    {
        return [
            'stage' => RoundStage::class,
            'order_index' => 'integer',
        ];
    }

    public function competition(): BelongsTo
    {
        return $this->belongsTo(Competition::class);
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(Season::class);
    }

    public function groups(): HasMany
    {
        return $this->hasMany(Group::class);
    }

    public function fixtures(): HasMany
    {
        return $this->hasMany(Fixture::class);
    }
}
