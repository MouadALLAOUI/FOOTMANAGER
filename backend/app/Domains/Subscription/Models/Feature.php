<?php

namespace App\Domains\Subscription\Models;

use App\Domains\Subscription\Enums\FeatureScope;
use App\Domains\Subscription\Enums\FeatureType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Feature extends Model
{
    protected $fillable = [
        'key',
        'name',
        'description',
        'type',
        'scope',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'type' => FeatureType::class,
            'scope' => FeatureScope::class,
            'is_active' => 'boolean',
        ];
    }

    public function plans(): BelongsToMany
    {
        return $this->belongsToMany(Plan::class, 'plan_features')
            ->using(PlanFeature::class)
            ->withPivot(['enabled', 'value', 'is_unlimited'])
            ->withTimestamps();
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeByKey(Builder $query, string $key): Builder
    {
        return $query->where('key', $key);
    }
}
