<?php

namespace App\Domains\Player\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Achievement extends Model
{
    use HasFactory;

    protected $table = 'achievements';

    protected $fillable = [
        'key',
        'title_ar',
        'title_en',
        'description_ar',
        'description_en',
        'icon',
        'category',
        'points',
    ];

    protected function casts(): array
    {
        return [
            'points' => 'integer',
        ];
    }

    public function playerAchievements(): HasMany
    {
        return $this->hasMany(PlayerAchievement::class);
    }

    public function title(string $locale = 'ar'): string
    {
        return $locale === 'en' ? $this->title_en : $this->title_ar;
    }

    public function description(?string $locale = 'ar'): ?string
    {
        return $locale === 'en' ? $this->description_en : $this->description_ar;
    }
}
