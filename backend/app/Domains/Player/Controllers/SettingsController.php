<?php

namespace App\Domains\Player\Controllers;

use App\Domains\Player\Resources\PlayerSettingsResource;
use App\Domains\Player\Services\PlayerProfileService;
use App\Domains\Shared\Base\Controller;
use App\Http\Requests\Player\UpdatePlayerSettingsRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private PlayerProfileService $service,
    ) {}

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new PlayerSettingsResource($this->service->for($request->user())),
        ]);
    }

    public function update(UpdatePlayerSettingsRequest $request): JsonResponse
    {
        $profile = $this->service->update($request->user(), $request->validated());

        return response()->json([
            'data' => new PlayerSettingsResource($profile),
        ]);
    }
}
