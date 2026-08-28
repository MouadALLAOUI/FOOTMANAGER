<?php

namespace App\Domains\Device\Controllers;

use App\Domains\Device\Models\Device;
use App\Domains\Device\Requests\StoreDeviceRequest;
use App\Domains\Device\Resources\DeviceResource;
use App\Domains\Device\Services\DeviceService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeviceController extends Controller
{
    public function __construct(
        private readonly DeviceService $devices,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'devices' => DeviceResource::collection($this->devices->devicesFor($request->user()))->resolve(),
        ]);
    }

    /**
     * Store or refresh the active device token for the authenticated user.
     */
    public function store(StoreDeviceRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $device = $this->devices->register(
            $request->user(),
            $validated['token'],
            $validated['platform'],
        );

        return response()->json([
            'message' => 'تم تسجيل الجهاز بنجاح',
            'device' => new DeviceResource($device->fresh()),
        ], 201);
    }

    /**
     * Unregister a specific device by id.
     */
    public function destroy(Request $request, Device $device): JsonResponse
    {
        if ((int) $device->user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'غير مصرح لك'], 403);
        }

        $this->devices->unregisterById($request->user(), (int) $device->id);

        return response()->json(['message' => 'تم إلغاء تسجيل الجهاز']);
    }

    /**
     * Unregister by token body — used on logout when the client only knows its
     * current push token (no device id round-trip needed).
     */
    public function destroyByToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'max:512'],
        ]);

        $removed = $this->devices->unregisterByToken($request->user(), $validated['token']);

        return response()->json(['message' => 'تم إلغاء تسجيل الجهاز', 'removed' => $removed > 0]);
    }
}