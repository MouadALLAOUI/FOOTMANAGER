<?php

namespace App\Models;

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

    public function terrains(): HasMany
    {
        return $this->hasMany(Stadium::class, 'owner_id');
    }

    public function terrainBookings(): HasMany
    {
        return $this->hasMany(TerrainBooking::class, 'manager_id');
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isTerrainOwner(): bool
    {
        return $this->role === 'terrain_owner';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }
}
