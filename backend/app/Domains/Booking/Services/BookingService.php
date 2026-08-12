<?php

namespace App\Domains\Booking\Services;

use App\Domains\Booking\Events\BookingCreated;
use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Stadium\Models\Stadium;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BookingService
{
    public function confirm(User $user, array $validated): TerrainBooking
    {
        $team = $user->team;

        if (! $team) {
            throw ValidationException::withMessages([
                'team' => 'يجب إنشاء ملف الفريق أولاً قبل الحجز',
            ]);
        }

        return DB::transaction(function () use ($user, $team, $validated) {
            $terrain = Stadium::where('id', $validated['terrain_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if (! $terrain->is_open) {
                throw ValidationException::withMessages([
                    'terrain_id' => 'الملعب مغلق حالياً — لا يمكن الحجز',
                ]);
            }

            if (! $terrain->is_available) {
                throw ValidationException::withMessages([
                    'terrain_id' => 'الملعب غير متاح حالياً — لا يمكن الحجز',
                ]);
            }

            if (! $terrain->cancellationPolicy) {
                throw ValidationException::withMessages([
                    'terrain_id' => 'الملعب لا يملك سياسة إلغاء — يرجى التواصل مع الإدارة',
                ]);
            }

            $date = Carbon::parse($validated['booking_date']);
            $dateStr = $date->toDateString();
            $start = $validated['start_time'];
            $end = $validated['end_time'];

            $slotStart = Carbon::parse($dateStr.' '.$start);
            if (! $slotStart->isFuture()) {
                throw ValidationException::withMessages([
                    'booking_date' => 'لا يمكن الحجز على توقيت انتهى بالفعل',
                ]);
            }

            $conflict = TerrainBooking::checkConflict($terrain->id, $dateStr, $start, $end);
            if ($conflict) {
                throw ValidationException::withMessages([
                    'time_slot' => 'هذا التوقيت محجوز بالفعل في التاريخ المحدد',
                ]);
            }

            $duplicate = TerrainBooking::where('terrain_id', $terrain->id)
                ->where('manager_id', $user->id)
                ->whereIn('status', ['pending', 'confirmed', 'approved'])
                ->where('booking_date', $dateStr)
                ->where('start_time', $start)
                ->where('end_time', $end)
                ->exists();

            if ($duplicate) {
                throw ValidationException::withMessages([
                    'time_slot' => 'لديك بالفعل حجز على هذا التوقيت',
                ]);
            }

            $subtotal = $this->computeSubtotal($terrain, $validated['booking_type']);
            $serviceFee = 0;
            $total = round($subtotal + $serviceFee, 2);

            $booking = TerrainBooking::create([
                'terrain_id' => $terrain->id,
                'manager_id' => $user->id,
                'team_id' => $team->id,
                'booking_type' => $validated['booking_type'],
                'flow_type' => 'direct',
                'reservation_type' => 'single',
                'booking_date' => $dateStr,
                'start_time' => $start,
                'end_time' => $end,
                'price' => $subtotal,
                'subtotal' => $subtotal,
                'service_fee' => $serviceFee,
                'total' => $total,
                'status' => 'pending',
                'notes' => $validated['notes'] ?? null,
                'booking_reference' => TerrainBooking::generateReference(),
                'uuid' => (string) Str::uuid(),
                'cancellation_policy_id' => $terrain->cancellation_policy_id,
                'payment_required' => true,
                'payment_status' => 'unpaid',
                'expires_at' => $slotStart,
            ]);

            $booking->load(['terrain.owner', 'team', 'manager', 'cancellationPolicy']);

            event(new BookingCreated($booking));

            return $booking;
        });
    }

    private function computeSubtotal(Stadium $terrain, string $bookingType): float
    {
        if ($bookingType === 'private') {
            return (float) ($terrain->total_price ?? $terrain->price_per_team ?? 0);
        }

        return (float) ($terrain->price_per_team ?? $terrain->total_price ?? 0);
    }
}
