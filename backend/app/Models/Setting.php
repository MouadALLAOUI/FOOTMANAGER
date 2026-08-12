<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'type',
        'group',
        'label',
        'description',
    ];

    public function getValueAttribute(): mixed
    {
        $value = $this->attributes['value'] ?? null;

        return match ($this->attributes['type'] ?? 'string') {
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'number' => $value === null || $value === '' ? null : (float) $value,
            'json' => $value ? json_decode($value, true) : [],
            default => $value,
        };
    }

    public function setValueAttribute(mixed $value): void
    {
        $this->attributes['value'] = is_array($value) ? json_encode($value) : $value;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();

        return $setting?->value ?? $default;
    }
}
