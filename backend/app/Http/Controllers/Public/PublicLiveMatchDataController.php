<?php

namespace App\Http\Controllers\Public;

use App\Domains\Match\Services\LiveMatchReactionService;
use App\Domains\Match\Services\PublicLiveMatchService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicLiveMatchDataController extends Controller
{
    public function __construct(
        private readonly PublicLiveMatchService $liveService,
        private readonly LiveMatchReactionService $reactionService,
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

        // Attach personal reaction for the requesting visitor
        $visitorId = $this->resolveVisitorId($request);
        if ($visitorId && isset($data['reactions'])) {
            $data['reactions']['my_reaction'] = $this->reactionService->getMyReaction($match, $visitorId);
        }

        return response()->json($data)
            ->header('Cache-Control', 'public, max-age=3')
            ->header('X-Robots-Tag', 'noindex, nofollow');
    }

    /**
     * Submit or toggle an audience reaction on the match score.
     */
    public function react(Request $request, string $token): JsonResponse
    {
        try {
            $match = $this->liveService->findByToken($token);
        } catch (ModelNotFoundException) {
            return response()->json([
                'message' => 'المباراة غير موجودة أو انتهت صلاحية الرابط',
            ], 404);
        }

        $validated = $request->validate([
            'type' => 'required|string|in:fire,applause,football,wow,love',
            'visitor_id' => 'nullable|string|max:100',
        ]);

        $visitorId = $this->resolveVisitorId($request);

        $result = $this->reactionService->react($match, $visitorId, $validated['type']);

        return response()->json([
            'success' => true,
            'reactions' => $result,
        ]);
    }

    protected function resolveVisitorId(Request $request): string
    {
        if ($request->user()) {
            return 'u:' . $request->user()->id;
        }

        $raw = $request->input('visitor_id') ?: $request->header('X-Visitor-Id');
        if ($raw && strlen($raw) >= 8 && strlen($raw) <= 100) {
            return 'v:' . preg_replace('/[^a-zA-Z0-9_-]/', '', $raw);
        }

        return 'ip:' . sha1($request->ip() . '|' . ($request->userAgent() ?: 'unknown'));
    }
}
