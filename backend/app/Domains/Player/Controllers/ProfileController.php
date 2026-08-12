<?php

namespace App\Domains\Player\Controllers;

use App\Domains\Player\Resources\PlayerProfileResource;
use App\Domains\Player\Services\PlayerProfileService;
use App\Domains\Shared\Base\Controller;
use App\Http\Requests\Player\UpdatePlayerProfileRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private PlayerProfileService $service,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $profile = $this->service->for($request->user());

        return response()->json([
            'data' => new PlayerProfileResource([
                'user' => $request->user(),
                'profile' => $profile,
            ]),
        ]);
    }

    public function showUser(Request $request, int $userId): JsonResponse
    {
        $profile = $this->service->findForUser($userId);

        if (! $profile) {
            return response()->json(['message' => 'Profile not found.'], 404);
        }

        $this->authorize('view', $profile);

        return response()->json([
            'data' => new PlayerProfileResource([
                'user' => $profile->user,
                'profile' => $profile,
            ]),
        ]);
    }

    public function update(UpdatePlayerProfileRequest $request): JsonResponse
    {
        $profile = $this->service->update($request->user(), $request->validated());

        return response()->json([
            'data' => new PlayerProfileResource([
                'user' => $request->user(),
                'profile' => $profile,
            ]),
        ]);
    }

    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:4096'],
        ]);

        $profile = $this->service->uploadPhoto($request->user(), $request->file('photo'));

        return response()->json([
            'data' => new PlayerProfileResource([
                'user' => $request->user(),
                'profile' => $profile,
            ]),
        ]);
    }

    public function uploadCover(Request $request): JsonResponse
    {
        $request->validate([
            'cover' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:4096'],
        ]);

        $profile = $this->service->uploadCover($request->user(), $request->file('cover'));

        return response()->json([
            'data' => new PlayerProfileResource([
                'user' => $request->user(),
                'profile' => $profile,
            ]),
        ]);
    }

    public function setAvailabilityStatus(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['required', 'in:available,busy,vacation,injured,unavailable'],
        ]);

        $profile = $this->service->setAvailabilityStatus($request->user(), $request->input('status'));

        return response()->json([
            'data' => [
                'availability_status' => $profile->availability_status,
                'is_available' => $profile->is_available,
            ],
        ]);
    }
}
