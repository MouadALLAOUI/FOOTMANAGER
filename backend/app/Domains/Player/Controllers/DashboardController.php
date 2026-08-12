<?php

namespace App\Domains\Player\Controllers;

use App\Domains\Player\Resources\PlayerDashboardResource;
use App\Domains\Player\Services\PlayerDashboardService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private PlayerDashboardService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new PlayerDashboardResource($this->service->for($request->user())),
        ]);
    }
}
