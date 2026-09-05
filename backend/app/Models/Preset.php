<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Preset extends Model
{
    public const CATEGORY_TEAM_LOGO = 'team_logo';

    public const CATEGORY_PROFILE_AVATAR = 'profile_avatar';

    protected $fillable = [
        'name',
        'category',
        'image_path',
        'image_thumbnail_path',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path
            ? Storage::disk('public')->url($this->image_path)
            : null;
    }

    public function getImageThumbnailUrlAttribute(): ?string
    {
        return $this->image_thumbnail_path
            ? Storage::disk('public')->url($this->image_thumbnail_path)
            : null;
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeCategory(Builder $query, string $category): Builder
    {
        return $query->where('category', $category);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }
}