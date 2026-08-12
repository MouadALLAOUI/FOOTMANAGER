<?php

namespace App\Domains\Competition\Models;

use App\Domains\Competition\Enums\SeasonStatus;
use App\Domains\Shared\Base\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Season extends Model
{
    protected $fillable = [
        'competition_id',
        'name',
        'starts_on',
        'ends_on',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'status' => SeasonStatus::class,
            'starts_on' => 'date',
            'ends_on' => 'date',
        ];
    }

    public function competition(): BelongsTo
    {
        return $this->belongsTo(Competition::class);
    }

    public function rounds(): HasMany
    {
        return $this->hasMany(Round::class)->orderBy('order_index');
    }

    public function groups(): HasMany
    {
        return $this->hasMany(Group::class);
    }

    public function fixtures(): HasMany
    {
        return $this->hasMany(Fixture::class);
    }

    public function standings(): HasMany
    {
        return $this->hasMany(Standing::class);
    }

    public function isActive(): bool
    {
        return $this->status === SeasonStatus::Active;
    }
}
