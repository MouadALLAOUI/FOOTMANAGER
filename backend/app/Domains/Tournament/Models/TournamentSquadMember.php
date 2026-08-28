<?php

namespace App\Domains\Tournament\Models;

use App\Domains\Player\Models\Player;
use App\Domains\Shared\Base\Model;
use App\Domains\Team\Models\Team;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A player selected into a tournament squad for one specific team.
 * Selection is capped per tournament by Tournament::$max_players_per_team.
 */
class TournamentSquadMember extends Model
{
    protected $fillable = [
        'tournament_id',
        'team_id',
        'player_id',
    ];

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }
}