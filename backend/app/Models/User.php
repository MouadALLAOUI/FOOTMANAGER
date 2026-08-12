<?php

namespace App\Models;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Player\Models\Player;
use App\Domains\Player\Models\PlayerAchievement;
use App\Domains\Player\Models\PlayerAvailabilitySlot;
use App\Domains\Player\Models\PlayerGalleryImage;
use App\Domains\Player\Models\PlayerMatchStat;
use App\Domains\Player\Models\PlayerProfile;
use App\Domains\Player\Models\PlayerStatistic;
use App\Domains\Player\Models\PlayerTeamHistory;
use App\Domains\Player\Models\PlayerTransfer;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use Database\Factories\UserFactory;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'is_whatsapp',
        'password',
        'role',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_whatsapp' => 'boolean',
        ];
    }

    protected function serializeDate(DateTimeInterface $date): string
    {
        return $date->format('Y-m-d\TH:i:s');
    }

    public function team(): HasOne
    {
        return $this->hasOne(Team::class, 'manager_id');
    }

    public function rosterPlayer(): HasOne
    {
        return $this->hasOne(Player::class, 'user_id');
    }

    public function terrains(): HasMany
    {
        return $this->hasMany(Stadium::class, 'owner_id');
    }

    public function terrainBookings(): HasMany
    {
        return $this->hasMany(TerrainBooking::class, 'manager_id');
    }

    public function playerProfile(): HasOne
    {
        return $this->hasOne(PlayerProfile::class);
    }

    public function galleryImages(): HasMany
    {
        return $this->hasMany(PlayerGalleryImage::class);
    }

    public function availabilitySlots(): HasMany
    {
        return $this->hasMany(PlayerAvailabilitySlot::class);
    }

    public function teamHistory(): HasMany
    {
        return $this->hasMany(PlayerTeamHistory::class);
    }

    public function transfers(): HasMany
    {
        return $this->hasMany(PlayerTransfer::class);
    }

    public function matchStats(): HasMany
    {
        return $this->hasMany(PlayerMatchStat::class);
    }

    public function statistics(): HasOne
    {
        return $this->hasOne(PlayerStatistic::class);
    }

    public function achievements(): HasMany
    {
        return $this->hasMany(PlayerAchievement::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isTerrainOwner(): bool
    {
        return $this->role === 'terrain_owner';
    }

    public function isPlayer(): bool
    {
        return $this->role === 'player';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function revokeTokens(): void
    {
        $this->tokens()->delete();
    }

    public function currentTeam(): ?Team
    {
        if ($this->isManager()) {
            return $this->team;
        }

        return $this->rosterPlayer?->team;
    }

    public function isManager(): bool
    {
        return $this->role === 'manager';
    }

    public function isCommittee(): bool
    {
        return $this->role === 'committee';
    }
}
