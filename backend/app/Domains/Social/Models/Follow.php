<?php

namespace App\Domains\Social\Models;

use App\Domains\Shared\Base\Model;
use App\Domains\Social\Events\UserFollowed;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Follow extends Model
{
    protected $fillable = [
        'follower_id',
        'followable_type',
        'followable_id',
    ];

    protected static function booted(): void
    {
        static::created(function (Follow $follow) {
            UserFollowed::dispatch($follow);
        });
    }

    public function follower(): BelongsTo
    {
        return $this->belongsTo(User::class, 'follower_id');
    }

    public function followable(): MorphTo
    {
        return $this->morphTo();
    }
}
