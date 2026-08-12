<?php

namespace App\Domains\Player\Models;

use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerTransfer extends Model
{
    use HasFactory;

    protected $table = 'player_transfers';

    public const TYPE_JOIN = 'join';

    public const TYPE_TRANSFER = 'transfer';

    public const TYPE_LEAVE = 'leave';

    public const TYPE_FREE_AGENT = 'free_agent';

    protected $fillable = [
        'user_id',
        'from_team_id',
        'to_team_id',
        'from_team_name',
        'to_team_name',
        'transferred_at',
        'type',
    ];

    protected function casts(): array
    {
        return [
            'transferred_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function fromTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'from_team_id');
    }

    public function toTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'to_team_id');
    }
}
