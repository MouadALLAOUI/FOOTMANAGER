<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TerrainSchedule extends Model
{
    protected $fillable = [
        'terrain_id',
        'day_of_week',
        'open_time',
        'close_time',
        'slot_duration_minutes',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'open_time' => 'string',
            'close_time' => 'string',
            'slot_duration_minutes' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    protected function openTime(): Attribute
    {
        return Attribute::get(fn ($value) => $value ? substr($value, 0, 5) : null);
    }

    protected function closeTime(): Attribute
    {
        return Attribute::get(fn ($value) => $value ? substr($value, 0, 5) : null);
    }

    public function terrain(): BelongsTo
    {
        return $this->belongsTo(Stadium::class, 'terrain_id');
    }
}
