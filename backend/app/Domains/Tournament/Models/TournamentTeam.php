<?php

namespace App\Domains\Tournament\Models;

use App\Domains\Competition\Models\Group;
use App\Domains\Shared\Base\Model;
use App\Domains\Team\Models\Team;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TournamentTeam extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_REGISTERED = 'registered';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_REMOVED = 'removed';

    public const PAYMENT_NOT_REQUIRED = 'not_required';

    public const PAYMENT_PENDING = 'pending';

    public const PAYMENT_COMPLETED = 'completed';

    protected $fillable = [
        'tournament_id',
        'team_id',
        'group_id',
        'group_position',
        'status',
        'payment_status',
    ];

    protected function casts(): array
    {
        return [
            'group_position' => 'integer',
        ];
    }

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }
}
