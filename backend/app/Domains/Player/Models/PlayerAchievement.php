<?php

namespace App\Domains\Player\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerAchievement extends Model
{
    use HasFactory;

    protected $table = 'player_achievements';

    protected $fillable = [
        'user_id',
        'achievement_id',
        'progress',
        'unlocked_at',
    ];

    protected function casts(): array
    {
        return [
            'progress' => 'integer',
            'unlocked_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function achievement(): BelongsTo
    {
        return $this->belongsTo(Achievement::class);
    }

    public function getIsUnlockedAttribute(): bool
    {
        return $this->unlocked_at !== null;
    }
}
