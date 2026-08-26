<?php

namespace App\Http\Controllers\Terrain;

use App\Domains\Booking\Events\BookingCreated;
use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Notification\Services\WhatsAppNotificationService;
use App\Domains\Shared\Base\Controller;
use App\Domains\Stadium\Models\Stadium;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DirectBookingController extends Controller
{
    public function __construct(
        private WhatsAppNotificationService $whatsapp,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'terrain_id' => 'required|exists:stadiums,id',
            'reservation_type' => 'required|in:single,weekly_subscription',
            'booking_date' => 'required_if:reservation_type,single|date|after_or_equal:today',
            'day_of_week' => 'required_if:reservation_type,weekly_subscription|nullable|integer|in:0,1,2,3,4,5,6',
            'start_date' => 'required_if:reservation_type,weekly_subscription|nullable|date|after_or_equal:today',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'purpose' => 'required|in:training,private',
            'notes' => 'nullable|string|max:500',
        ]);

        $terrain = Stadium::findOrFail($validated['terrain_id']);

        if (! $terrain->is_open) {
            return response()->json(['message' => 'الملعب مغلق حالياً — لا يمكن الحجز'], 422);
        }

        $team = $user->team;
        if (! $team) {
            return response()->json(['message' => 'يجب إنشاء ملف الفريق أولاً'], 422);
        }

        $isWeekly = $validated['reservation_type'] === 'weekly_subscription';

        if ($isWeekly) {
            $checkDate = Carbon::parse($validated['start_date']);
        } else {
            $checkDate = Carbon::parse($validated['booking_date']);
        }

        $conflictMsg = null;
        $unavailableMsg = null;
        $price = $terrain->price_per_team ?? 0;

        $booking = null;
        DB::transaction(function () use ($validated, $terrain, $isWeekly, &$conflictMsg, &$unavailableMsg, &$price, &$booking, $user, $team) {
            \App\Domains\Stadium\Models\Stadium::where('id', $validated['terrain_id'])->lockForUpdate()->first();
            $dateToLock = $isWeekly ? $validated['start_date'] : $validated['booking_date'];
            TerrainBooking::where('terrain_id', $validated['terrain_id'])
                ->where(function ($q) use ($dateToLock) {
                    $q->where('booking_date', $dateToLock)
                        ->orWhere(function ($sq) use ($dateToLock) {
                            $sq->where('reservation_type', 'weekly_subscription')
                                ->where(function ($wq) use ($dateToLock) {
                                    $wq->whereNull('start_date')->orWhere('start_date', '<=', $dateToLock);
                                })
                                ->where(function ($wq) use ($dateToLock) {
                                    $wq->whereNull('end_date')->orWhere('end_date', '>=', $dateToLock);
                                });
                        });
                })->lockForUpdate()->get();

            $conflictMsg = TerrainBooking::getConflictMessage(
                $validated['terrain_id'],
                $dateToLock,
                $validated['start_time'],
                $validated['end_time']
            );

            if ($conflictMsg) {
                return;
            }

            $closure = \App\Domains\Booking\Models\TerrainSlotClosure::where('terrain_id', $validated['terrain_id'])
                ->where('closure_date', $dateToLock)
                ->where('start_time', '<', $validated['end_time'])
                ->where('end_time', '>', $validated['start_time'])
                ->first();
            if ($closure) {
                $unavailableMsg = $closure->reason ? "هذا التوقيت مغلق — {$closure->reason}" : 'هذا التوقيت مغلق — لا يمكن الحجز';
                return;
            }

            if ($isWeekly) {
                $weeks = 4;
                if ($validated['end_date']) {
                    $weeks = (int) ceil(Carbon::parse($validated['start_date'])->diffInWeeks(Carbon::parse($validated['end_date'])) ?: 4);
                }
                $price = $price * $weeks;
            }

            $booking = TerrainBooking::create([
                'terrain_id' => $validated['terrain_id'],
                'manager_id' => $user->id,
                'team_id' => $team->id,
                'booking_type' => $validated['purpose'],
                'flow_type' => 'direct',
                'reservation_type' => $validated['reservation_type'],
                'booking_date' => $isWeekly ? $validated['start_date'] : $validated['booking_date'],
                'day_of_week' => $isWeekly ? $validated['day_of_week'] : null,
                'start_date' => $isWeekly ? $validated['start_date'] : null,
                'end_date' => $validated['end_date'] ?? null,
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
                'price' => $price,
                'status' => 'pending',
                'notes' => $validated['notes'] ?? null,
            ]);
        });

        if ($conflictMsg) {
            return response()->json(['message' => $conflictMsg], 409);
        }

        if ($unavailableMsg) {
            return response()->json(['message' => $unavailableMsg], 422);
        }

        if (! $booking) {
            return response()->json(['message' => 'تعذر إنشاء الحجز'], 500);
        }

        $booking->load(['terrain.owner', 'team', 'manager']);
        $booking->terrain?->owner?->makeVisible('phone');

        event(new BookingCreated($booking));

        return response()->json([
            'message' => $isWeekly
                ? 'تم إرسال طلب الأبونمان الأسبوعي بنجاح. بانتظار تأكيد صاحب الملعب'
                : 'تم إرسال طلب الحجز بنجاح. بانتظار تأكيد صاحب الملعب',
            'booking' => $booking,
            'whatsapp_notification_url' => $this->whatsapp->buildBookingRequestMessage($booking),
        ], 201);
    }
}
