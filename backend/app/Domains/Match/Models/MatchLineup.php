<?php

namespace App\Domains\Match\Models;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Model;
use App\Domains\Team\Models\Team;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchLineup extends Model
{
    protected $fillable = [
        'match_id',
        'match_request_id',
        'team_id',
        'player_id',
        'position',
        'tactical_position',
        'role',
        'x',
        'y',
        'shirt_number',
        'is_starter',
        'is_captain',
        'is_vice_captain',
        'is_free_kick_taker',
        'is_penalty_taker',
        'is_corner_taker',
        'order_index',
    ];

    protected function casts(): array
    {
        return [
            'is_starter' => 'boolean',
            'is_captain' => 'boolean',
            'is_vice_captain' => 'boolean',
            'is_free_kick_taker' => 'boolean',
            'is_penalty_taker' => 'boolean',
            'is_corner_taker' => 'boolean',
            'x' => 'float',
            'y' => 'float',
            'order_index' => 'integer',
        ];
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(FootballMatch::class, 'match_id');
    }

    public function matchRequest(): BelongsTo
    {
        return $this->belongsTo(MatchRequest::class, 'match_request_id');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'player_id');
    }

    public function scopeStarters($query)
    {
        return $query->where('is_starter', true)->orderBy('order_index');
    }

    public function scopeBench($query)
    {
        return $query->where('is_starter', false)->orderBy('order_index');
    }
}
