<?php

namespace App\Domains\Subscription\Models;

use App\Domains\Subscription\Enums\BillingInterval;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Plan extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'price',
        'currency',
        'billing_interval',
        'is_free',
        'is_active',
        'display_order',
        'badge',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'billing_interval' => BillingInterval::class,
            'is_free' => 'boolean',
            'is_active' => 'boolean',
            'display_order' => 'integer',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function features(): BelongsToMany
    {
        return $this->belongsToMany(Feature::class, 'plan_features')
            ->using(PlanFeature::class)
            ->withPivot(['enabled', 'value', 'is_unlimited'])
            ->withTimestamps();
    }

    public function discount(): HasOne
    {
        return $this->hasOne(PlanDiscount::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeFree(Builder $query): Builder
    {
        return $query->where('is_free', true);
    }

    public static function free(): ?self
    {
        return static::query()
            ->free()
            ->active()
            ->orderBy('display_order')
            ->first();
    }
}
