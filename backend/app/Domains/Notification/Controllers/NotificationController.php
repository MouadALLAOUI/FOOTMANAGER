<?php

namespace App\Domains\Notification\Controllers;

use App\Domains\Notification\Models\AppNotification;
use App\Domains\Notification\Resources\NotificationResource;
use App\Domains\Notification\Services\NotificationPreferenceService;
use App\Domains\Notification\Services\NotificationService;
use App\Domains\Shared\Base\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NotificationController extends Controller
{
    public function __construct(
        protected NotificationService $service,
        protected NotificationPreferenceService $preferences,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = AppNotification::where('user_id', $user->id);

        $filter = $request->query('filter');
        if ($filter === 'unread') {
            $query->where('is_read', false);
        } elseif ($filter === 'read') {
            $query->where('is_read', true);
        } elseif ($filter === 'important') {
            $query->where('is_important', true);
        } elseif ($filter === 'pinned') {
            $query->where('is_pinned', true);
        }

        $category = $request->query('category');
        if ($category && in_array($category, NotificationService::categories(), true)) {
            $query->whereIn('type', NotificationService::typesInCategory($category));
        }

        $notifications = $query->orderBy('is_pinned', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        $items = array_map(
            fn (AppNotification $notification): array => array_merge(
                $notification->toArray(),
                ['category' => NotificationService::categoryOf($notification->type)],
            ),
            $notifications->items(),
        );

        $unreadCount = AppNotification::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'notifications' => $items,
            'unread_count' => $unreadCount,
            'has_more' => $notifications->hasMorePages(),
            'categories' => NotificationService::categories(),
        ]);
    }

    public function markAsRead(Request $request, int $id): JsonResponse
    {
        $notification = AppNotification::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        $notification->update(['is_read' => true]);

        return response()->json(['message' => 'تم']);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        AppNotification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'تم']);
    }

    public function togglePin(Request $request, int $id): JsonResponse
    {
        $notification = AppNotification::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        $notification->update(['is_pinned' => ! $notification->is_pinned]);

        return response()->json(['notification' => $notification]);
    }

    public function toggleImportant(Request $request, int $id): JsonResponse
    {
        $notification = AppNotification::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        $notification->update(['is_important' => ! $notification->is_important]);

        return response()->json(['notification' => $notification]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'unread_count' => $this->service->unreadCount($request->user()->id),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->service->delete($request->user()->id, $id);

        return response()->json(['message' => 'تم حذف الإشعار.']);
    }

    public function preferences(Request $request): JsonResponse
    {
        return response()->json([
            'preferences' => $this->preferences->get($request->user()),
            'meta' => $this->preferences->meta(),
        ]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $data = $request->validate([
            'preferences' => 'required|array',
        ]);

        $preferences = $this->preferences->update($request->user(), $data['preferences']);

        return response()->json(['preferences' => $preferences]);
    }

    public function indexV1(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $query = AppNotification::where('user_id', $user->id);

        $filter = $request->query('filter');
        if ($filter === 'unread') {
            $query->where('is_read', false);
        } elseif ($filter === 'read') {
            $query->where('is_read', true);
        } elseif ($filter === 'important') {
            $query->where('is_important', true);
        } elseif ($filter === 'pinned') {
            $query->where('is_pinned', true);
        }

        $category = $request->query('category');
        if ($category && in_array($category, NotificationService::categories(), true)) {
            $query->whereIn('type', NotificationService::typesInCategory($category));
        }

        $notifications = $query->orderBy('is_pinned', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return NotificationResource::collection($notifications);
    }
}
