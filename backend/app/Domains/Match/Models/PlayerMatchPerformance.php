<?php

namespace App\Domains\Match\Models;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Model;
use App\Domains\Team\Models\Team;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerMatchPerformance extends Model
{
    protected $fillable = [
        'match_id',
        'team_id',
        'player_id',
        'minutes_played',
        'rating',
        'goals',
        'assists',
        'own_goals',
        'yellow_cards',
        'red_cards',
        'saves',
        'clean_sheet',
        'mvp',
    ];

    protected function casts(): array
    {
        return [
            'minutes_played' => 'integer',
            'rating' => 'float',
            'goals' => 'integer',
            'assists' => 'integer',
            'own_goals' => 'integer',
            'yellow_cards' => 'integer',
            'red_cards' => 'integer',
            'saves' => 'integer',
            'clean_sheet' => 'boolean',
            'mvp' => 'boolean',
        ];
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(FootballMatch::class, 'match_id');
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
