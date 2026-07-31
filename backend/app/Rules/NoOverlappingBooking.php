<?php

namespace App\Rules;

use App\Models\TerrainBooking;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Carbon;

class NoOverlappingBooking implements ValidationRule
{
    public function __construct(
        private int $terrainId,
        private string $date,
        private string $startTime,
        private string $endTime,
        private ?int $excludeId = null,
        private ?int $dayOfWeek = null,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $checkDate = Carbon::parse($this->date);
        $dow = $this->dayOfWeek ?? $checkDate->dayOfWeek;

        $activeBookings = TerrainBooking::where('terrain_id', $this->terrainId)
            ->whereIn('status', ['pending', 'approved'])
            ->where(function ($q) use ($dow, $checkDate) {
                // Single bookings on this exact date
                $q->where(function ($sq) use ($checkDate) {
                    $sq->where('reservation_type', 'single')
                        ->where('booking_date', $checkDate->toDateString());
                })
                // Weekly subscriptions covering this day_of_week
                ->orWhere(function ($sq) use ($dow, $checkDate) {
                    $sq->where('reservation_type', 'weekly_subscription')
                        ->where('day_of_week', $dow)
                        ->where(function ($ssq) use ($checkDate) {
                            $dateStr = $checkDate->toDateString();
                            $ssq->where(function ($fff) use ($dateStr) {
                                $fff->whereNull('start_date')
                                    ->orWhere('start_date', '<=', $dateStr);
                            });
                            $ssq->where(function ($fff) use ($dateStr) {
                                $fff->whereNull('end_date')
                                    ->orWhere('end_date', '>=', $dateStr);
                            });
                        });
                });
            })
            ->where('start_time', '<', $this->endTime)
            ->where('end_time', '>', $this->startTime);

        if ($this->excludeId) {
            $activeBookings->where('id', '!=', $this->excludeId);
        }

        if ($activeBookings->exists()) {
            $conflict = $activeBookings->first();
            if ($conflict->reservation_type === 'weekly_subscription') {
                $fail('هذا التوقيت محجوز مسبقاً عبر أبونمان أسبوعي.');
            } else {
                $fail('هذا الوقت محجوز بالفعل في التاريخ المحدد.');
            }
        }
    }
}
