<?php

namespace App\Domains\Booking\Models;

use App\Domains\Stadium\Models\Stadium;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CancellationPolicy extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'hours_before',
        'refund_percentage',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'hours_before' => 'integer',
            'refund_percentage' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function stadiums(): HasMany
    {
        return $this->hasMany(Stadium::class);
    }

    public function refundPercentageAt(Carbon $slotStart, ?Carbon $now = null): int
    {
        if ($this->hours_before === null) {
            return $this->refund_percentage;
        }

        $now = $now ?? now();

        return $slotStart->copy()->subHours($this->hours_before)->gt($now)
            ? $this->refund_percentage
            : 0;
    }

    public function refundAmountAt(Carbon $slotStart, float $total, ?Carbon $now = null): float
    {
        return round($total * $this->refundPercentageAt($slotStart, $now) / 100, 2);
    }
}
