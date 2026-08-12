<?php

namespace App\Domains\Player\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerStatistic extends Model
{
    use HasFactory;

    protected $table = 'player_statistics';

    protected $fillable = [
        'user_id',
        'matches_played',
        'wins',
        'draws',
        'losses',
        'goals',
        'assists',
        'own_goals',
        'yellow_cards',
        'red_cards',
        'clean_sheets',
        'minutes_played',
        'total_rating',
        'rating_count',
        'avg_rating',
        'best_match_rating',
        'mvp_count',
        'current_streak_type',
        'current_streak_count',
        'longest_winning_streak',
        'last_synced_at',
    ];

    protected function casts(): array
    {
        return [
            'matches_played' => 'integer',
            'wins' => 'integer',
            'draws' => 'integer',
            'losses' => 'integer',
            'goals' => 'integer',
            'assists' => 'integer',
            'own_goals' => 'integer',
            'yellow_cards' => 'integer',
            'red_cards' => 'integer',
            'clean_sheets' => 'integer',
            'minutes_played' => 'integer',
            'total_rating' => 'decimal:1',
            'rating_count' => 'integer',
            'avg_rating' => 'decimal:1',
            'best_match_rating' => 'decimal:1',
            'mvp_count' => 'integer',
            'current_streak_count' => 'integer',
            'longest_winning_streak' => 'integer',
            'last_synced_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getWinRateAttribute(): float
    {
        if ($this->matches_played === 0) {
            return 0;
        }

        return round($this->wins / $this->matches_played * 100, 1);
    }
}
