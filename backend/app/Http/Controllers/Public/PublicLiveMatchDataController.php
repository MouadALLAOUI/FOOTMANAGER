<?php

namespace App\Http\Controllers\Public;

use App\Domains\Match\Services\PublicLiveMatchService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicLiveMatchDataController extends Controller
{
    public function __construct(
        private readonly PublicLiveMatchService $liveService,
    ) {}

    /**
     * Incremental live match data polling endpoint.
     * Rate-limited, unauthenticated, strictly read-only.
     */
    public function data(Request $request, string $token): JsonResponse
    {
        try {
            $match = $this->liveService->findByToken($token);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => 'المباراة غير موجودة أو انتهت صلاحية الرابط',
            ], 404);
        }

        $sinceId = $request->has('since_id') ? (int) $request->input('since_id') : null;
        $sinceTime = $request->input('since_time') ?: $request->input('since_updated_at');

        $data = $this->liveService->getMatchData($match, $sinceId, $sinceTime);

        return response()->json($data)
            ->header('Cache-Control', 'public, max-age=3')
            ->header('X-Robots-Tag', 'noindex, nofollow');
    }
}
