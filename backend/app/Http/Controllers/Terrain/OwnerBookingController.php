<?php

namespace App\Http\Controllers\Terrain;

use App\Domains\Booking\Events\BookingApproved;
use App\Domains\Booking\Events\BookingRejected;
use App\Domains\Booking\Models\CancellationRequest;
use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Notification\Services\NotificationService;
use App\Domains\Notification\Services\WhatsAppNotificationService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Domains\Booking\Services\SlotAvailabilityService;

class OwnerBookingController extends Controller
{
    public function __construct(
        private WhatsAppNotificationService $whatsapp,
    ) {}

    public function approve(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $booking = TerrainBooking::whereHas('terrain', function ($q) use ($user) {
            $q->where('owner_id', $user->id);
        })->where('id', $id)->firstOrFail();

        if ($booking->status !== 'pending') {
            return response()->json(['message' => 'هذا الحجز ليس في حالة انتظار'], 422);
        }

        $conflictMsg = null;

        DB::transaction(function () use ($booking, &$conflictMsg) {
            // Lock existing bookings for this terrain and the relevant date/window
            $dateToLock = $booking->isWeeklySubscription() ? ($booking->start_date?->toDateString() ?? now()->toDateString()) : ($booking->booking_date?->toDateString() ?? now()->toDateString());

            TerrainBooking::where('terrain_id', $booking->terrain_id)
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

            // Check for conflicts excluding this booking
            $conflictMsg = app(SlotAvailabilityService::class)->conflictMessage(
                $booking->terrain_id,
                $dateToLock,
                $booking->start_time,
                $booking->end_time,
                SlotAvailabilityService::CONFLICT_STATUSES,
                $booking->id
            );

            if ($conflictMsg) {
                return;
            }

            $booking->update(['status' => 'approved']);
        });

        if ($conflictMsg) {
            return response()->json(['message' => $conflictMsg], 422);
        }

        $booking->refresh()->load(['terrain.owner', 'team', 'manager']);

        event(new BookingApproved($booking));

        if ($booking->manager_id) {
            NotificationService::push(
                (int) $booking->manager_id,
                'reservation_approved',
                'تم تأكيد حجز الملعب',
                "صاحب الملعب {$booking->terrain?->name} قام بتأكيد حجزك في تاريخ {$booking->booking_date?->format('Y-m-d')}",
                ['booking_id' => $booking->id, 'terrain_id' => $booking->terrain_id],
                '/dashboard/my-reservations',
            );
        }

        return response()->json([
            'message' => 'تم تأكيد الحجز بنجاح',
            'booking' => $booking,
            'whatsapp_notification_url' => $this->whatsapp
                ->buildOwnerDecisionMessage($booking, 'approved'),
        ]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $booking = TerrainBooking::whereHas('terrain', function ($q) use ($user) {
            $q->where('owner_id', $user->id);
        })->where('id', $id)->firstOrFail();

        if ($booking->status !== 'pending') {
            return response()->json(['message' => 'هذا الحجز ليس في حالة انتظار'], 422);
        }

        $conflictMsg = null;

        DB::transaction(function () use ($booking, &$conflictMsg) {
            $bookingLock = TerrainBooking::where('id', $booking->id)->lockForUpdate()->first();

            if ($bookingLock->status !== 'pending') {
                $conflictMsg = 'تم التعامل مع هذا الحجز مسبقاً';
                return;
            }

            $bookingLock->update(['status' => 'rejected']);
        });

        if ($conflictMsg) {
            return response()->json(['message' => $conflictMsg], 422);
        }

        $booking->refresh()->load(['terrain.owner', 'team', 'manager']);

        event(new BookingRejected($booking));

        if ($booking->manager_id) {
            NotificationService::push(
                (int) $booking->manager_id,
                'reservation_rejected',
                'تم رفض حجز الملعب',
                "صاحب الملعب {$booking->terrain?->name} قام برفض حجزك في تاريخ {$booking->booking_date?->format('Y-m-d')}",
                ['booking_id' => $booking->id],
                '/dashboard/my-reservations',
            );
        }

        return response()->json([
            'message' => 'تم رفض الحجز',
            'booking' => $booking,
            'whatsapp_notification_url' => $this->whatsapp
                ->buildOwnerDecisionMessage($booking, 'rejected'),
        ]);
    }

    public function cancellationRequests(Request $request): JsonResponse
    {
        $user = $request->user();

        $requests = CancellationRequest::whereHas('booking.terrain', function ($q) use ($user) {
            $q->where('owner_id', $user->id);
        })
            ->where('status', 'pending')
            ->with(['booking.terrain:id,name', 'booking.team:id,name', 'user:id,name,phone'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['cancellation_requests' => $requests]);
    }

    public function handleCancellation(Request $request, int $cancellationId): JsonResponse
    {
        $user = $request->user();

        $cancellation = CancellationRequest::whereHas('booking.terrain', function ($q) use ($user) {
            $q->where('owner_id', $user->id);
        })->where('id', $cancellationId)->firstOrFail();

        $validated = $request->validate([
            'action' => 'required|in:approve,reject',
        ]);

        if ($cancellation->status !== 'pending') {
            return response()->json(['message' => 'تم التعامل مع هذا الطلب مسبقاً'], 422);
        }

        if ($validated['action'] === 'approve') {
            $cancellation->booking->update(['status' => 'cancelled']);
            $cancellation->update(['status' => 'approved']);
            $message = 'تمت الموافقة على إلغاء الحجز';
            NotificationService::push(
                (int) $cancellation->user_id,
                'cancellation_approved',
                'تمت الموافقة على إلغاء الحجز',
                "صاحب الملعب {$cancellation->booking?->terrain?->name} وافق على إلغاء حجزك",
                ['booking_id' => $cancellation->terrain_booking_id],
                '/dashboard/my-reservations',
            );
        } else {
            $cancellation->update(['status' => 'rejected']);
            $message = 'تم رفض طلب الإلغاء';
            NotificationService::push(
                (int) $cancellation->user_id,
                'cancellation_rejected',
                'تم رفض إلغاء الحجز',
                "صاحب الملعب {$cancellation->booking?->terrain?->name} رفض إلغاء حجزك",
                ['booking_id' => $cancellation->terrain_booking_id],
                '/dashboard/my-reservations',
            );
        }

        return response()->json(['message' => $message]);
    }
}
