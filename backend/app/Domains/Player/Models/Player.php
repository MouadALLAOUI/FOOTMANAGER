<?php

namespace App\Domains\Player\Models;

use App\Domains\Player\Models\PlayerProfile;
use App\Domains\Team\Models\Attendance;
use App\Domains\Team\Models\Team;
use App\Domains\Team\Models\TeamMatchPlayer;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Player extends Model
{
    use HasFactory;

    public const ROLE_STARTER = 'starter';

    public const ROLE_SUBSTITUTE = 'substitute';

    public const ROLE_RESERVE = 'reserve';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_SUSPENDED = 'suspended';

    public const STATUS_INJURED = 'injured';

    public const STATUS_UNAVAILABLE = 'unavailable';

    protected $fillable = [
        'team_id',
        'user_id',
        'name',
        'position',
        'preferred_position',
        'number',
        'phone',
        'is_whatsapp',
        'role',
        'preferred_foot',
        'height_cm',
        'weight_kg',
        'status',
        'is_essential',
        'emergency_contact',
        'medical_notes',
        'joined_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'number' => 'integer',
            'is_whatsapp' => 'boolean',
            'is_essential' => 'boolean',
            'height_cm' => 'integer',
            'weight_kg' => 'integer',
            'joined_at' => 'date',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(Attendance::class, 'player_id');
    }

    public function matchPlayers(): HasMany
    {
        return $this->hasMany(TeamMatchPlayer::class, 'player_id');
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function playerProfile(): HasOne
    {
        return $this->hasOne(PlayerProfile::class, 'user_id', 'user_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function scopeEssential(Builder $query): Builder
    {
        return $query->where('is_essential', true);
    }
}
