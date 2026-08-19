<?php

namespace App\Models;

use App\Domains\Shared\Base\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class AccountRecovery extends Model
{
    protected $fillable = [
        'user_id',
        'admin_id',
        'token',
        'expires_at',
        'used_at',
    ];

    protected $hidden = [
        'token',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'used_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public static function generateFor(User $user, User $admin): self
    {
        return self::create([
            'user_id' => $user->id,
            'admin_id' => $admin->id,
            'token' => Str::random(64),
            'expires_at' => now()->addHours(2),
        ]);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isUsed(): bool
    {
        return $this->used_at !== null;
    }

    public function canBeUsed(): bool
    {
        return ! $this->isExpired() && ! $this->isUsed();
    }

    public function markUsed(): void
    {
        $this->update(['used_at' => now()]);
    }
}
