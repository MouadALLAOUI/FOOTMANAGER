<?php

namespace App\Http\Controllers\Terrain;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Booking\Models\TerrainSchedule;
use App\Domains\Booking\Models\TerrainSlotClosure;
use App\Domains\Shared\Base\Controller;
use App\Domains\Stadium\Models\Stadium;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class SlotClosureController extends Controller
{
    public function index(Request $request, int $terrainId): JsonResponse
    {
        $user = $request->user();
        $terrain = Stadium::where('id', $terrainId)->where('owner_id', $user->id)->firstOrFail();

        $closures = TerrainSlotClosure::where('terrain_id', $terrain->id)
            ->where('closure_date', '>=', now()->subDay()->toDateString())
            ->orderBy('closure_date')
            ->orderBy('start_time')
            ->get();

        return response()->json(['closures' => $closures]);
    }

    public function store(Request $request, int $terrainId): JsonResponse
    {
        $user = $request->user();
        $terrain = Stadium::where('id', $terrainId)->where('owner_id', $user->id)->firstOrFail();

        $validated = $request->validate([
            'closure_date' => 'required|date|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'reason' => 'nullable|string|max:255',
        ]);

        $closureDate = Carbon::parse($validated['closure_date']);
        $dateStr = $closureDate->toDateString();
        $dayOfWeek = $closureDate->dayOfWeek;
        $startTime = $validated['start_time'];
        $endTime = $validated['end_time'];

        // 1. Validate working hours — closure must fall within the terrain's schedule
        $schedule = TerrainSchedule::where('terrain_id', $terrain->id)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_active', true)
            ->first();

        if (! $schedule) {
            return response()->json([
                'message' => 'الملعب غير متاح في هذا اليوم',
            ], 422);
        }

        if ($startTime < $schedule->open_time || $endTime > $schedule->close_time) {
            return response()->json([
                'message' => "الوقت خارج ساعات العمل ({$schedule->open_time} — {$schedule->close_time})",
            ], 422);
        }

        // 2. Check for active bookings that overlap this closure time range
        $conflictingBooking = TerrainBooking::where('terrain_id', $terrain->id)
            ->whereIn('status', ['pending', 'approved'])
            ->where(function ($q) use ($dateStr, $dayOfWeek, $startTime, $endTime) {
                // Single bookings on the same date
                $q->where(function ($sq) use ($dateStr, $startTime, $endTime) {
                    $sq->where('reservation_type', 'single')
                        ->where('booking_date', $dateStr)
                        ->where('start_time', '<', $endTime)
                        ->where('end_time', '>', $startTime);
                });
                // Weekly subscriptions covering this day and overlapping the time range
                $q->orWhere(function ($sq) use ($dayOfWeek, $dateStr, $startTime, $endTime) {
                    $sq->where('reservation_type', 'weekly_subscription')
                        ->where('day_of_week', $dayOfWeek)
                        ->where(function ($wq) use ($dateStr) {
                            $wq->whereNull('start_date')->orWhere('start_date', '<=', $dateStr);
                        })
                        ->where(function ($wq) use ($dateStr) {
                            $wq->whereNull('end_date')->orWhere('end_date', '>=', $dateStr);
                        })
                        ->where('start_time', '<', $endTime)
                        ->where('end_time', '>', $startTime);
                });
            })
            ->first();

        if ($conflictingBooking) {
            return response()->json([
                'message' => 'لا يمكن إغلاق هذا التوقيت لوجود حجز قائم. يرجى التواصل مع صاحب الحجز لإلغاء الحجز أو تغيير موعده.',
            ], 422);
        }

        // 3. Check for existing closure conflicts (prevent overlapping closures)
        $conflictingClosure = TerrainSlotClosure::where('terrain_id', $terrain->id)
            ->where('closure_date', $dateStr)
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime)
            ->first();

        if ($conflictingClosure) {
            return response()->json([
                'message' => 'يوجد إغلاق آخر يتقاطع مع هذا التوقيت.',
            ], 422);
        }

        $validated['terrain_id'] = $terrain->id;
        $validated['closure_date'] = $dateStr;

        $closure = TerrainSlotClosure::create($validated);

        return response()->json([
            'message' => 'تم إغلاق التوقيت بنجاح',
            'closure' => $closure,
        ], 201);
    }

    public function destroy(Request $request, int $terrainId, int $closureId): JsonResponse
    {
        $user = $request->user();
        $terrain = Stadium::where('id', $terrainId)->where('owner_id', $user->id)->firstOrFail();

        $closure = TerrainSlotClosure::where('id', $closureId)
            ->where('terrain_id', $terrain->id)
            ->firstOrFail();

        $closure->delete();

        return response()->json(['message' => 'تم فتح التوقيت بنجاح']);
    }
}