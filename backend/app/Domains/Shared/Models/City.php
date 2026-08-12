<?php

namespace App\Domains\Shared\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class City extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'name_ar',
        'name_fr',
        'name_en',
        'slug',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function stadiums(): HasMany
    {
        return $this->hasMany(\App\Domains\Stadium\Models\Stadium::class, 'city_id');
    }

    public function teams(): HasMany
    {
        return $this->hasMany(\App\Domains\Team\Models\Team::class, 'city_id');
    }

    public function playerProfiles(): HasMany
    {
        return $this->hasMany(\App\Domains\Player\Models\PlayerProfile::class, 'city_id');
    }

    public function getLocalizedNameAttribute(): string
    {
        $locale = app()->getLocale();
        return match ($locale) {
            'ar' => $this->name_ar ?? $this->name,
            'fr' => $this->name_fr ?? $this->name,
            'en' => $this->name_en ?? $this->name,
            default => $this->name,
        };
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }
}