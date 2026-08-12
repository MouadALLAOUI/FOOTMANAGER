<?php

namespace App\Domains\Match\Models;

use App\Domains\Shared\Base\Model;
use App\Domains\Team\Models\Team;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchStatistic extends Model
{
    protected $fillable = [
        'match_id',
        'team_id',
        'possession',
        'shots',
        'shots_on_target',
        'corners',
        'fouls',
        'yellow_cards',
        'red_cards',
        'offsides',
        'saves',
        'passes',
        'pass_accuracy',
        'expected_goals',
    ];

    protected function casts(): array
    {
        return [
            'possession' => 'integer',
            'shots' => 'integer',
            'shots_on_target' => 'integer',
            'corners' => 'integer',
            'fouls' => 'integer',
            'yellow_cards' => 'integer',
            'red_cards' => 'integer',
            'offsides' => 'integer',
            'saves' => 'integer',
            'passes' => 'integer',
            'pass_accuracy' => 'float',
            'expected_goals' => 'float',
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
}
