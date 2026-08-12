<?php

namespace App\Http\Controllers\Admin;

use App\Domains\Shared\Base\Controller;
use App\Domains\Social\Models\Activity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public const TYPES = [
        Activity::TYPE_TEAM_CREATED,
        Activity::TYPE_PLAYER_JOINED,
        Activity::TYPE_MATCH_CREATED,
        Activity::TYPE_MATCH_FINISHED,
        Activity::TYPE_TEAM_WON,
        Activity::TYPE_STADIUM_CREATED,
        Activity::TYPE_TOP_SCORER,
        Activity::TYPE_ACHIEVEMENT_UNLOCKED,
        Activity::TYPE_BOOKING_COMPLETED,
        Activity::TYPE_REVIEW_ADDED,
    ];

    public function index(Request $request): JsonResponse
    {
        $type = $request->query('type', 'all');

        $query = Activity::query()
            ->with(['actor:id,name,email,role,status', 'subject'])
            ->latest();

        if ($type !== 'all' && in_array($type, self::TYPES, true)) {
            $query->where('type', $type);
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->whereHasMorph('actor', '*', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $perPage = min(50, max(1, (int) $request->query('per_page', 15)));
        $paginator = $query->paginate($perPage)->withQueryString();

        $activities = $paginator->getCollection()
            ->map(fn (Activity $activity) => [
                'id' => $activity->id,
                'type' => $activity->type,
                'actor' => $activity->actor ? [
                    'id' => $activity->actor->getKey(),
                    'name' => $activity->actor->getAttribute('name'),
                    'email' => $activity->actor->getAttribute('email'),
                    'role' => $activity->actor->getAttribute('role'),
                ] : null,
                'subject' => $activity->subject ? [
                    'type' => $activity->subject->getMorphClass(),
                    'id' => $activity->subject->getKey(),
                    'summary' => $activity->subject->getAttribute('name')
                        ?? $activity->subject->getAttribute('title')
                        ?? $activity->subject->getAttribute('body')
                        ?? null,
                ] : null,
                'data' => $activity->data,
                'image_url' => $activity->image_url,
                'created_at' => $activity->created_at?->toIso8601String(),
            ])
            ->values();

        return response()->json([
            'activities' => $activities,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}
