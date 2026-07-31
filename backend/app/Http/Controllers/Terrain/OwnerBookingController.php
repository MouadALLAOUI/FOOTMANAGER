<?php

namespace App\Http\Controllers\Terrain;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\CancellationRequest;
use App\Models\TerrainBooking;
use App\Services\WhatsAppNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        $booking->update(['status' => 'approved']);

        $booking->load(['terrain.owner', 'team', 'manager']);

        if ($booking->manager_id) {
            AppNotification::create([
                'user_id' => $booking->manager_id,
                'type' => 'reservation_approved',
                'title' => 'تم تأكيد حجز الملعب',
                'body' => "صاحب الملعب {$booking->terrain?->name} قام بتأكيد حجزك في تاريخ {$booking->booking_date?->format('Y-m-d')}",
                'data' => ['booking_id' => $booking->id, 'terrain_id' => $booking->terrain_id],
                'action_url' => '/dashboard/my-reservations',
            ]);
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

        $booking->update(['status' => 'rejected']);

        $booking->load(['terrain.owner', 'team', 'manager']);

        if ($booking->manager_id) {
            AppNotification::create([
                'user_id' => $booking->manager_id,
                'type' => 'reservation_rejected',
                'title' => 'تم رفض حجز الملعب',
                'body' => "صاحب الملعب {$booking->terrain?->name} قام برفض حجزك في تاريخ {$booking->booking_date?->format('Y-m-d')}",
                'data' => ['booking_id' => $booking->id],
                'action_url' => '/dashboard/my-reservations',
            ]);
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
            AppNotification::create([
                'user_id' => $cancellation->user_id,
                'type' => 'cancellation_approved',
                'title' => 'تمت الموافقة على إلغاء الحجز',
                'body' => "صاحب الملعب {$cancellation->booking?->terrain?->name} وافق على إلغاء حجزك",
                'data' => ['booking_id' => $cancellation->terrain_booking_id],
                'action_url' => '/dashboard/my-reservations',
            ]);
        } else {
            $cancellation->update(['status' => 'rejected']);
            $message = 'تم رفض طلب الإلغاء';
            AppNotification::create([
                'user_id' => $cancellation->user_id,
                'type' => 'cancellation_rejected',
                'title' => 'تم رفض إلغاء الحجز',
                'body' => "صاحب الملعب {$cancellation->booking?->terrain?->name} رفض إلغاء حجزك",
                'data' => ['booking_id' => $cancellation->terrain_booking_id],
                'action_url' => '/dashboard/my-reservations',
            ]);
        }

        return response()->json(['message' => $message]);
    }
}
