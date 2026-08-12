<?php

namespace App\Domains\Social\Models;

use App\Domains\Shared\Base\Model;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Reaction extends Model
{
    public const LIKE = 'like';

    public const LOVE = 'love';

    public const FIRE = 'fire';

    public const APPLAUSE = 'applause';

    public const TYPES = [self::LIKE, self::LOVE, self::FIRE, self::APPLAUSE];

    protected $fillable = [
        'user_id',
        'reactionable_type',
        'reactionable_id',
        'type',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reactionable(): MorphTo
    {
        return $this->morphTo();
    }
}
