<?php

namespace App\Domains\Match\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerMatchRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'player_id',
        'match_request_id',
        'type',
        'position',
        'status',
        'message',
    ];

    protected function casts(): array
    {
        return [
            'player_id' => 'integer',
            'match_request_id' => 'integer',
        ];
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(User::class, 'player_id');
    }

    public function matchRequest(): BelongsTo
    {
        return $this->belongsTo(MatchRequest::class, 'match_request_id');
    }
}
