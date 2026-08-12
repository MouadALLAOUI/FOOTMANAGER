<?php

namespace App\Domains\Player\Controllers;

use App\Domains\Player\Models\PlayerAvailabilitySlot;
use App\Domains\Player\Resources\PlayerAvailabilityResource;
use App\Domains\Player\Services\PlayerAvailabilityService;
use App\Domains\Player\Services\PlayerProfileService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AvailabilityController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private PlayerAvailabilityService $service,
        private PlayerProfileService $profiles,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => [
                'status' => $this->profiles->for($request->user())->availability_status,
                'weekly' => $this->service->weeklySchedule($request->user()->id),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'day_of_week' => ['required', 'integer', 'between:0,6'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $slot = $this->service->store($request->user(), $request->all());

        return response()->json([
            'data' => new PlayerAvailabilityResource($slot),
        ], 201);
    }

    public function update(Request $request, PlayerAvailabilitySlot $slot): JsonResponse
    {
        $this->authorize('update', $slot);

        $request->validate([
            'day_of_week' => ['sometimes', 'integer', 'between:0,6'],
            'start_time' => ['sometimes', 'date_format:H:i'],
            'end_time' => ['sometimes', 'date_format:H:i', 'after:start_time'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $slot = $this->service->update($request->user(), $slot, $request->all());

        return response()->json([
            'data' => new PlayerAvailabilityResource($slot),
        ]);
    }

    public function destroy(Request $request, PlayerAvailabilitySlot $slot): JsonResponse
    {
        $this->authorize('delete', $slot);

        $this->service->destroy($request->user(), $slot);

        return response()->json(['message' => 'Slot deleted.'], 200);
    }
}
