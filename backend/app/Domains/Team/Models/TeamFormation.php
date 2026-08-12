<?php

namespace App\Domains\Team\Models;

use App\Domains\Player\Models\Player;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeamFormation extends Model
{
    use HasFactory;

    public const FORMATS = ['5v5', '7v7', '11v11'];

    protected $fillable = [
        'team_id',
        'name',
        'format',
        'formation',
        'positions',
        'bench',
        'substitutes',
        'captain_id',
        'vice_captain_id',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'positions' => 'array',
            'bench' => 'array',
            'substitutes' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
    }

    public function captain(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'captain_id');
    }

    public function viceCaptain(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'vice_captain_id');
    }
}
