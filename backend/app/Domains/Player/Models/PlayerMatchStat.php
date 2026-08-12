<?php

namespace App\Domains\Player\Models;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerMatchStat extends Model
{
    use HasFactory;

    protected $table = 'player_match_stats';

    public const RESULT_WIN = 'win';

    public const RESULT_DRAW = 'draw';

    public const RESULT_LOSS = 'loss';

    protected $fillable = [
        'user_id',
        'match_request_id',
        'team_id',
        'match_date',
        'result',
        'is_tournament',
        'started',
        'played',
        'minutes',
        'goals',
        'assists',
        'own_goals',
        'yellow_cards',
        'red_cards',
        'rating',
        'mvp',
        'clean_sheet',
    ];

    protected function casts(): array
    {
        return [
            'match_date' => 'date',
            'is_tournament' => 'boolean',
            'started' => 'boolean',
            'played' => 'boolean',
            'minutes' => 'integer',
            'goals' => 'integer',
            'assists' => 'integer',
            'own_goals' => 'integer',
            'yellow_cards' => 'integer',
            'red_cards' => 'integer',
            'rating' => 'decimal:1',
            'mvp' => 'boolean',
            'clean_sheet' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function matchRequest(): BelongsTo
    {
        return $this->belongsTo(MatchRequest::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
