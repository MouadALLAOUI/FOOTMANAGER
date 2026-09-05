<?php

namespace App\Models;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Player\Models\Player;
use App\Domains\Subscription\Enums\SubscriptionStatus;
use App\Domains\Subscription\Models\Plan;
use App\Domains\Subscription\Models\Subscription;
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
use App\Models\AccountRecovery;
use Database\Factories\UserFactory;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;
use NotificationChannels\WebPush\HasPushSubscriptions;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasPushSubscriptions, Notifiable, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'is_whatsapp',
        'password',
        'role',
        'status',
        'avatar_path',
        'avatar_thumbnail_path',
        'avatar_color',
        'activity_locked',
        'activity_lock_reason',
        'activity_locked_by',
        'activity_locked_at',
    ];

    protected $appends = [
        'avatar_url',
        'avatar_thumbnail_url',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'phone',
        'email',
        'is_whatsapp',
        'avatar_path',
        'avatar_thumbnail_path',
        'email_verified_at',
        'activity_lock_reason',
        'activity_locked_by',
        'activity_locked_at',
    ];

    protected static function booted(): void
    {
        static::updated(function (User $user) {
            if ($user->wasChanged('status') && in_array($user->status, ['blocked', 'rejected'], true)) {
                $user->revokeTokens();
            }
            if ($user->wasChanged('password')) {
                $user->revokeTokens();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_whatsapp' => 'boolean',
            'activity_locked' => 'boolean',
            'activity_locked_at' => 'datetime',
        ];
    }

    protected function serializeDate(DateTimeInterface $date): string
    {
        return $date->format('Y-m-d\TH:i:s');
    }

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->resolveStorageUrl($this->avatar_path);
    }

    public function getAvatarThumbnailUrlAttribute(): ?string
    {
        return $this->resolveStorageUrl($this->avatar_thumbnail_path);
    }

    public function getPlanNameAttribute(): ?string
    {
        return $this->activeSubscription?->plan?->name;
    }

    private function resolveStorageUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (str_starts_with($path, 'http')) {
            return $path;
        }

        return Storage::disk('public')->url($path);
    }

    public function team(): HasOne
    {
        return $this->hasOne(Team::class, 'manager_id');
    }

    public function devices(): HasMany
    {
        return $this->hasMany(\App\Domains\Device\Models\Device::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription(): HasOne
    {
        return $this->hasOne(Subscription::class)
            ->where('status', SubscriptionStatus::Active)
            ->latestOfMany();
    }

    public function currentPlan(): ?Plan
    {
        return $this->activeSubscription?->plan ?? Plan::free();
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

    public function isSubAdmin(): bool
    {
        return $this->role === 'sub_admin';
    }

    public function hasAdminAccess(): bool
    {
        return $this->role === 'admin' || $this->role === 'sub_admin';
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'user_permissions');
    }

    public function hasPermission(string $slug): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        if (! $this->isSubAdmin()) {
            return false;
        }

        return $this->permissions()->where('slug', $slug)->exists();
    }

    public function getPermissionSlugs(): array
    {
        if ($this->isAdmin()) {
            return Permission::pluck('slug')->toArray();
        }

        return $this->permissions()->pluck('slug')->toArray();
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

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new \App\Notifications\Auth\ResetPasswordNotification($token));
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

    public function recoveries(): HasMany
    {
        return $this->hasMany(AccountRecovery::class, 'user_id');
    }

    public function initiatedRecoveries(): HasMany
    {
        return $this->hasMany(AccountRecovery::class, 'admin_id');
    }

    public function lockedBy(): HasOne
    {
        return $this->hasOne(User::class, 'id', 'activity_locked_by');
    }

    public function isActivityLocked(): bool
    {
        return (bool) $this->activity_locked;
    }

    public function lockActivity(string $reason, int $adminId): void
    {
        $this->update([
            'activity_locked' => true,
            'activity_lock_reason' => $reason,
            'activity_locked_by' => $adminId,
            'activity_locked_at' => now(),
        ]);
    }

    public function unlockActivity(): void
    {
        $this->update([
            'activity_locked' => false,
            'activity_lock_reason' => null,
            'activity_locked_by' => null,
            'activity_locked_at' => null,
        ]);
    }

    /**
     * Check if this user can be safely deleted by an admin.
     *
     * Deletion is blocked when the user owns active resources that
     * cannot be orphaned without breaking business logic.
     */
    public function canBeDeleted(): array
    {
        $blockers = [];

        if ($this->isManager()) {
            $team = $this->team;
            if ($team) {
                $activeBookings = $team->terrainBookings()
                    ->whereIn('status', ['pending', 'approved'])
                    ->count();
                if ($activeBookings > 0) {
                    $blockers[] = "الفريق لديه {$activeBookings} حجز(ות) نشطة";
                }

                $pendingMatches = $team->hostedMatches()
                    ->whereIn('status', ['open', 'accepted', 'pending_score', 'pending_confirmation'])
                    ->count();
                $pendingMatches += $team->opponentMatches()
                    ->whereIn('status', ['open', 'accepted', 'pending_score', 'pending_confirmation'])
                    ->count();
                if ($pendingMatches > 0) {
                    $blockers[] = "الفريق لديه {$pendingMatches} مباراة(ات) نشطة";
                }
            }
        }

        if ($this->isTerrainOwner()) {
            $activeBookings = $this->terrainBookings()
                ->whereIn('status', ['pending', 'approved'])
                ->count();
            if ($activeBookings > 0) {
                $blockers[] = "لديك {$activeBookings} حجز(ات) نشطة على أراضيك";
            }
        }

        if ($this->isPlayer()) {
            $activeTeam = $this->rosterPlayer()->where('status', 'active')->first();
            if ($activeTeam) {
                $blockers[] = 'أنت عضو نشط في فريق';
            }
        }

        return $blockers;
    }
}
