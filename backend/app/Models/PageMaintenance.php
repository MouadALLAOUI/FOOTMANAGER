<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class PageMaintenance extends Model
{

    protected $table = 'page_maintenance';

    protected $fillable = [
        'path',
        'enabled',
        'message',
        'starts_at',
        'ends_at',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function isActive(): bool
    {
        if (!$this->enabled) {
            return false;
        }

        $now = Carbon::now();

        if ($this->starts_at && $now->lt($this->starts_at)) {
            return false;
        }

        if ($this->ends_at && $now->gt($this->ends_at)) {
            return false;
        }

        return true;
    }

    public static function getActivePages(): array
    {
        return static::where('enabled', true)
            ->get()
            ->filter(fn(PageMaintenance $page) => $page->isActive())
            ->values()
            ->toArray();
    }

    public static function isPageActive(string $path): bool
    {
        $page = static::where('path', $path)->first();

        return $page && $page->isActive();
    }
}
