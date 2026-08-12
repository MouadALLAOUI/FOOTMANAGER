<?php

namespace App\Domains\Booking\Controllers;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Booking\Resources\BookingDetailsResource;
use App\Domains\Booking\Resources\BookingHistoryResource;
use App\Domains\Booking\Resources\BookingResource;
use App\Domains\Booking\Resources\PaymentIntentResource;
use App\Domains\Booking\Resources\ReceiptResource;
use App\Domains\Booking\Services\BookingService;
use App\Domains\Booking\Services\CancellationService;
use App\Domains\Booking\Services\PaymentIntentService;
use App\Domains\Booking\Services\ReceiptService;
use App\Domains\Shared\Base\Controller;
use App\Http\Requests\V1\CancelBookingRequest;
use App\Http\Requests\V1\StoreBookingRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BookingController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private BookingService $bookings,
        private PaymentIntentService $paymentIntents,
        private CancellationService $cancellations,
        private ReceiptService $receipts,
    ) {}

    public function confirm(StoreBookingRequest $request): JsonResponse
    {
        $this->authorize('create', TerrainBooking::class);

        $booking = $this->bookings->confirm($request->user(), $request->validated());

        return response()->json([
            'data' => new BookingResource($booking),
        ], 201);
    }

    public function paymentIntent(Request $request, TerrainBooking $booking): JsonResponse
    {
        $this->authorize('requestPayment', $booking);

        $intent = $this->paymentIntents->create($booking);

        return response()->json([
            'data' => new PaymentIntentResource($intent),
        ]);
    }

    public function show(Request $request, TerrainBooking $booking): JsonResponse
    {
        $this->authorize('view', $booking);

        $booking->load(['terrain.owner', 'team', 'cancellationPolicy', 'payments']);

        return response()->json([
            'data' => new BookingDetailsResource($booking),
        ]);
    }

    public function history(Request $request): AnonymousResourceCollection
    {
        $bookings = TerrainBooking::with(['terrain.owner', 'team', 'cancellationPolicy'])
            ->where('manager_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->paginate(20);

        return BookingHistoryResource::collection($bookings);
    }

    public function upcoming(Request $request): AnonymousResourceCollection
    {
        $bookings = TerrainBooking::with(['terrain.owner', 'team', 'cancellationPolicy'])
            ->where('manager_id', $request->user()->id)
            ->whereIn('status', ['pending', 'confirmed', 'approved'])
            ->whereDate('booking_date', '>=', now()->toDateString())
            ->orderBy('booking_date')
            ->orderBy('start_time')
            ->paginate(20);

        return BookingResource::collection($bookings);
    }

    public function cancel(CancelBookingRequest $request, TerrainBooking $booking): JsonResponse
    {
        $this->authorize('cancel', $booking);

        $result = $this->cancellations->cancel(
            $booking,
            $request->validated('reason'),
            $request->user(),
        );

        return response()->json([
            'data' => [
                'cancelled' => $result['cancelled'],
                'refund_percentage' => $result['refund_percentage'],
                'refund_amount' => $result['refund_amount'],
                'cancellation_reason' => $result['cancellation_reason'],
                'booking' => new BookingResource($result['booking']),
            ],
        ]);
    }

    public function receipt(Request $request, TerrainBooking $booking): JsonResponse|BinaryFileResponse
    {
        $this->authorize('viewReceipt', $booking);

        $path = $this->receipts->generate($booking);

        if ($request->wantsJson()) {
            return response()->json([
                'data' => new ReceiptResource($booking),
            ]);
        }

        return response()->file($path, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="receipt-'.$booking->booking_reference.'.pdf"',
        ]);
    }
}
