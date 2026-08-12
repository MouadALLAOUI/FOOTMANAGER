<?php

namespace App\Domains\Team\Models;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Player\Models\Player;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    use HasFactory;

    public const PRESENT = 'present';

    public const ABSENT = 'absent';

    public const LATE = 'late';

    public const EXCUSED = 'excused';

    protected $fillable = [
        'team_id',
        'player_id',
        'match_request_id',
        'session_date',
        'status',
        'recorded_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'session_date' => 'date',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class, 'player_id');
    }

    public function matchRequest(): BelongsTo
    {
        return $this->belongsTo(MatchRequest::class, 'match_request_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function attended(): bool
    {
        return in_array($this->status, [self::PRESENT, self::LATE], true);
    }
}
