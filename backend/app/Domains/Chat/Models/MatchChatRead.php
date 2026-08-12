<?php

namespace App\Domains\Chat\Models;

use App\Domains\Match\Models\FootballMatch;
use App\Domains\Shared\Base\Model;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchChatRead extends Model
{
    protected $fillable = [
        'match_id',
        'user_id',
        'last_read_message_id',
    ];

    protected function casts(): array
    {
        return [
            'last_read_message_id' => 'integer',
        ];
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(FootballMatch::class, 'match_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
