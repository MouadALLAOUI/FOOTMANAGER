<?php

namespace App\Domains\Subscription\Models;

use App\Domains\Subscription\Enums\BillingInterval;
use App\Domains\Subscription\Enums\SubscriptionStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    protected $fillable = [
        'user_id',
        'plan_id',
        'status',
        'starts_at',
        'ends_at',
        'cancelled_at',
        'price_at_start',
        'currency',
        'billing_interval',
    ];

    protected function casts(): array
    {
        return [
            'status' => SubscriptionStatus::class,
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'price_at_start' => 'decimal:2',
            'billing_interval' => BillingInterval::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', SubscriptionStatus::Active);
    }

    public function scopeCurrent(Builder $query): Builder
    {
        return $query->where('status', SubscriptionStatus::Active)
            ->where(function (Builder $query) {
                $query->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            });
    }

    public function isActive(): bool
    {
        return $this->status === SubscriptionStatus::Active;
    }
}
