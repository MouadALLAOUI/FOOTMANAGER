<?php

namespace App\Http\Controllers\Terrain;

use App\Domains\Booking\Models\TerrainSchedule;
use App\Domains\Shared\Base\Controller;
use App\Domains\Shared\Support\PublicCache;
use App\Domains\Stadium\Models\Stadium;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OwnerTerrainController extends Controller
{
    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $terrain = Stadium::where('owner_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        $validated = $request->validate([
            'is_open' => 'required|boolean',
            'closure_reason' => 'nullable|string|max:255',
        ]);

        $terrain->update([
            'is_open' => $validated['is_open'],
            'closure_reason' => $validated['is_open'] ? null : ($validated['closure_reason'] ?? null),
        ]);

        PublicCache::flushTerrains();

        return response()->json([
            'message' => $terrain->is_open
                ? 'تم فتح الملعب بنجاح — يستقبل الحجوزات الآن'
                : 'تم إغلاق الملعب بنجاح — لا يستقبل حجوزات جديدة',
            'terrain' => $terrain->only(['id', 'name', 'is_open', 'closure_reason']),
        ]);
    }

    public function updateWorkingHours(Request $request, int $id): JsonResponse
    {
        $terrain = Stadium::where('owner_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        $validated = $request->validate([
            'schedule' => 'required|array|size:7',
            'schedule.*.day_of_week' => 'required|integer|in:0,1,2,3,4,5,6',
            'schedule.*.open_time' => 'required_if:schedule.*.is_active,true|nullable|date_format:H:i',
            'schedule.*.close_time' => 'required_if:schedule.*.is_active,true|nullable|date_format:H:i|after:schedule.*.open_time',
            'schedule.*.is_active' => 'required|boolean',
        ]);

        foreach ($validated['schedule'] as $day) {
            TerrainSchedule::updateOrCreate(
                ['terrain_id' => $terrain->id, 'day_of_week' => $day['day_of_week']],
                [
                    'open_time' => $day['open_time'] ?? '09:00',
                    'close_time' => $day['close_time'] ?? '23:00',
                    'slot_duration_minutes' => 60,
                    'is_active' => $day['is_active'],
                ]
            );
        }

        $schedules = TerrainSchedule::where('terrain_id', $terrain->id)
            ->orderBy('day_of_week')
            ->get();

        PublicCache::flushTerrains();

        return response()->json([
            'message' => 'تم حفظ أوقات العمل بنجاح',
            'schedule' => $schedules,
        ]);
    }
}
