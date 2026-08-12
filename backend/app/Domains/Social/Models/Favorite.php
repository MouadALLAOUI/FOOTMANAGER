<?php

namespace App\Domains\Social\Models;

use App\Domains\Shared\Base\Model;
use App\Domains\Social\Events\FavoriteAdded;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Favorite extends Model
{
    protected $fillable = [
        'user_id',
        'favoritable_type',
        'favoritable_id',
    ];

    protected static function booted(): void
    {
        static::created(function (Favorite $favorite) {
            FavoriteAdded::dispatch($favorite);
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function favoritable(): MorphTo
    {
        return $this->morphTo();
    }
}
