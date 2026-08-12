<?php

namespace App\Domains\Competition\Models;

use App\Domains\Competition\Enums\CompetitionType;
use App\Domains\Shared\Base\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Competition extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'type',
        'logo_path',
        'description',
        'country',
        'active',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'type' => CompetitionType::class,
            'active' => 'boolean',
            'settings' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Competition $competition) {
            $competition->slug ??= Str::slug($competition->name);
        });
    }

    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo_path ? Storage::disk('public')->url($this->logo_path) : null;
    }

    public function seasons(): HasMany
    {
        return $this->hasMany(Season::class)->orderByDesc('starts_on');
    }

    public function rounds(): HasMany
    {
        return $this->hasMany(Round::class)->orderBy('order_index');
    }

    public function groups(): HasMany
    {
        return $this->hasMany(Group::class);
    }

    public function fixtures(): HasMany
    {
        return $this->hasMany(Fixture::class);
    }

    public function standings(): HasMany
    {
        return $this->hasMany(Standing::class);
    }
}
