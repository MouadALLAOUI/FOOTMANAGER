<?php

namespace App\Domains\Booking\Services;

use App\Domains\Booking\Events\BookingCancelled;
use App\Domains\Booking\Models\CancellationRequest;
use App\Domains\Booking\Models\TerrainBooking;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CancellationService
{
    public function cancel(TerrainBooking $booking, ?string $reason, User $by): array
    {
        return DB::transaction(function () use ($booking, $reason, $by) {
            $locked = TerrainBooking::whereKey($booking->id)->lockForUpdate()->firstOrFail();

            if (! in_array($locked->status, ['pending', 'confirmed', 'approved'], true)) {
                throw ValidationException::withMessages([
                    'status' => 'لا يمكن إلغاء هذا الحجز في حالته الحالية',
                ]);
            }

            $slotStart = Carbon::parse($locked->booking_date->toDateString().' '.$locked->start_time);

            if (! $slotStart->isFuture()) {
                throw ValidationException::withMessages([
                    'status' => 'لا يمكن إلغاء حجز انتهى وقته',
                ]);
            }

            $policy = $locked->cancellationPolicy;
            $refundPercentage = $policy
                ? $policy->refundPercentageAt($slotStart)
                : 0;
            $refundAmount = round(((float) $locked->total) * $refundPercentage / 100, 2);

            $locked->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => $reason,
                'refund_percentage' => $refundPercentage,
                'refund_amount' => $refundAmount,
            ]);

            if ($locked->payment_status === 'paid') {
                $locked->update(['payment_status' => 'refunded']);
                $locked->payments()->where('status', 'succeeded')->update(['status' => 'refunded']);
            }

            CancellationRequest::create([
                'terrain_booking_id' => $locked->id,
                'user_id' => $by->id,
                'reason' => $reason,
                'status' => 'approved',
            ]);

            $locked->load(['terrain.owner', 'team', 'manager', 'cancellationPolicy']);

            event(new BookingCancelled($locked, $by));

            return [
                'cancelled' => true,
                'refund_percentage' => $refundPercentage,
                'refund_amount' => $refundAmount,
                'cancellation_reason' => $reason,
                'booking' => $locked,
            ];
        });
    }
}
