<?php

namespace App\Http\Controllers\Terrain;

use App\Domains\Booking\Models\TerrainSlotClosure;
use App\Domains\Shared\Base\Controller;
use App\Domains\Stadium\Models\Stadium;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        $validated['terrain_id'] = $terrain->id;

        // Check for active bookings that conflict with the closure
        $conflictingBooking = TerrainBooking::where('terrain_id', $terrain->id)
            ->whereIn('status', ['pending', 'approved'])
            ->where(function ($q) use ($validated) {
                $q->where('booking_date', $validated['closure_date'])
                    ->orWhere(function ($sq) use ($validated) {
                        $sq->where('reservation_type', 'weekly_subscription')
                            ->where('day_of_week', $validated['closure_date']->dayOfWeek)
                            ->where(function ($wq) use ($validated) {
                                $wq->whereNull('start_date')
                                    ->orWhere('start_date', '<=', $validated['closure_date']->toDateString());
                            })
                            ->where(function ($wq) use ($validated) {
                                $wq->whereNull('end_date')
                                    ->orWhere('end_date', '>=', $validated['closure_date']->toDateString());
                            });
                    })
                    ->first();
            });

        if ($conflictingBooking) {
            return response()->json([
                'message' => 'لا يمكن إغلاق الملعب لوجود حجز قائم. يرجى التواصل مع صاحب الحجز لإلغاء الحجز أو تغيير موعده.',
            ], 422);
        }

        $validated['terrain_id'] = $terrain->id;

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