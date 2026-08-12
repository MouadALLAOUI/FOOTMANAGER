<?php

namespace App\Domains\Player\Models;

use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerTeamHistory extends Model
{
    use HasFactory;

    protected $table = 'player_team_history';

    protected $fillable = [
        'user_id',
        'team_id',
        'team_name',
        'joined_at',
        'left_at',
        'is_current',
        'matches_played',
        'goals',
        'achievements',
    ];

    protected function casts(): array
    {
        return [
            'joined_at' => 'date',
            'left_at' => 'date',
            'is_current' => 'boolean',
            'matches_played' => 'integer',
            'goals' => 'integer',
            'achievements' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
