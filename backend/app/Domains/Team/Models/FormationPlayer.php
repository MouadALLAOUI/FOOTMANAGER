<?php

namespace App\Domains\Team\Models;

use App\Domains\Player\Models\Player;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FormationPlayer extends Model
{
    use HasFactory;

    protected $fillable = [
        'formation_id',
        'player_id',
        'tactical_position',
        'role',
        'x',
        'y',
        'is_starter',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'x' => 'float',
            'y' => 'float',
            'is_starter' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function formation(): BelongsTo
    {
        return $this->belongsTo(TeamFormation::class, 'formation_id');
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'player_id');
    }
}
