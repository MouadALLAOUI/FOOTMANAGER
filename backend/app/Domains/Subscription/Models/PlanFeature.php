<?php

namespace App\Domains\Subscription\Models;

use App\Domains\Subscription\Enums\FeatureType;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class PlanFeature extends Pivot
{
    protected $table = 'plan_features';

    public $incrementing = true;

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'value' => 'integer',
            'is_unlimited' => 'boolean',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function feature(): BelongsTo
    {
        return $this->belongsTo(Feature::class);
    }

    public function isUnlimited(): bool
    {
        return $this->is_unlimited;
    }

    public function limitValue(): ?int
    {
        if ($this->feature?->type === FeatureType::Limit && ! $this->is_unlimited) {
            return $this->value;
        }

        return null;
    }
}
