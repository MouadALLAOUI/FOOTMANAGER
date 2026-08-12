<?php

namespace App\Rules;

use App\Domains\Booking\Services\SlotAvailabilityService;
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

        $conflict = app(SlotAvailabilityService::class)->firstConflict(
            terrainId: $this->terrainId,
            date: $this->date,
            startTime: $this->startTime,
            endTime: $this->endTime,
            statuses: SlotAvailabilityService::CONFLICT_STATUSES,
            excludeId: $this->excludeId,
            dayOfWeek: $dow,
        );

        if (! $conflict) {
            return;
        }

        if ($conflict->reservation_type === 'weekly_subscription') {
            $fail('هذا التوقيت محجوز مسبقاً عبر أبونمان أسبوعي.');
        } else {
            $fail('هذا الوقت محجوز بالفعل في التاريخ المحدد.');
        }
    }
}
