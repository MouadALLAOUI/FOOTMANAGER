<?php

namespace App\Domains\Social\Models;

use App\Domains\Shared\Base\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Activity extends Model
{
    public const TYPE_TEAM_CREATED = 'team_created';

    public const TYPE_PLAYER_JOINED = 'player_joined';

    public const TYPE_MATCH_CREATED = 'match_created';

    public const TYPE_MATCH_FINISHED = 'match_finished';

    public const TYPE_TEAM_WON = 'team_won';

    public const TYPE_STADIUM_CREATED = 'stadium_created';

    public const TYPE_TOP_SCORER = 'top_scorer';

    public const TYPE_ACHIEVEMENT_UNLOCKED = 'achievement_unlocked';

    public const TYPE_BOOKING_COMPLETED = 'booking_completed';

    public const TYPE_REVIEW_ADDED = 'review_added';

    public const TYPE_SUB_ADMIN_CREATED = 'sub_admin_created';

    public const TYPE_SUB_ADMIN_UPDATED = 'sub_admin_updated';

    public const TYPE_SUB_ADMIN_PERMISSIONS_CHANGED = 'sub_admin_permissions_changed';

    public const TYPE_SUB_ADMIN_BLOCKED = 'sub_admin_blocked';

    public const TYPE_SUB_ADMIN_ACTIVATED = 'sub_admin_activated';

    public const TYPE_SUB_ADMIN_REMOVED = 'sub_admin_removed';

    public const TYPE_PLAN_ASSIGNED = 'plan_assigned';
    public const TYPE_PLAN_CHANGED = 'plan_changed';
    public const TYPE_PLAN_REMOVED = 'plan_removed';

    protected $fillable = [
        'type',
        'actor_type',
        'actor_id',
        'subject_type',
        'subject_id',
        'data',
        'image_url',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
        ];
    }

    public function actor(): MorphTo
    {
        return $this->morphTo();
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    public function reactions(): MorphMany
    {
        return $this->morphMany(Reaction::class, 'reactionable');
    }

    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }
}
