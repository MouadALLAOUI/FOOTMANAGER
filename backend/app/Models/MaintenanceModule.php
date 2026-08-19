<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceModule extends Model
{
    protected $fillable = [
        'module',
        'enabled',
        'block_reads',
        'message',
        'starts_at',
        'ends_at',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'block_reads' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function isActive(): bool
    {
        if (! $this->enabled) {
            return false;
        }

        $now = now();

        if ($this->starts_at && $this->starts_at->isAfter($now)) {
            return false;
        }

        if ($this->ends_at && $this->ends_at->isBefore($now)) {
            return false;
        }

        return true;
    }

    public static function getActiveModules(): array
    {
        return static::where('enabled', true)
            ->get()
            ->filter(fn (MaintenanceModule $m) => $m->isActive())
            ->map(fn (MaintenanceModule $m) => [
                'module' => $m->module,
                'message' => $m->message,
                'block_reads' => $m->block_reads,
                'starts_at' => $m->starts_at?->toISOString(),
                'ends_at' => $m->ends_at?->toISOString(),
            ])
            ->values()
            ->all();
    }

    public static function isModuleActive(string $module): bool
    {
        $setting = static::where('module', $module)->first();

        return $setting?->isActive() ?? false;
    }
}
