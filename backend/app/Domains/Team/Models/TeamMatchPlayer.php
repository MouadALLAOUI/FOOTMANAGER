<?php

namespace App\Domains\Team\Models;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Player\Models\Player;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeamMatchPlayer extends Model
{
    use HasFactory;

    protected $fillable = [
        'match_request_id',
        'team_id',
        'player_id',
        'started',
        'played',
        'minutes',
        'goals',
        'assists',
        'rating',
        'mvp',
    ];

    protected function casts(): array
    {
        return [
            'started' => 'boolean',
            'played' => 'boolean',
            'minutes' => 'integer',
            'goals' => 'integer',
            'assists' => 'integer',
            'rating' => 'decimal:1',
            'mvp' => 'boolean',
        ];
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
}
