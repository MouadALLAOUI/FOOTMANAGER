<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = AppNotification::where('user_id', $user->id);

        $type = $request->query('filter');
        if ($type === 'unread') {
            $query->where('is_read', false);
        } elseif ($type === 'important') {
            $query->where('is_important', true);
        } elseif ($type === 'pinned') {
            $query->where('is_pinned', true);
        }

        $notifications = $query->orderBy('is_pinned', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        $unreadCount = AppNotification::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'notifications' => $notifications->items(),
            'unread_count' => $unreadCount,
            'has_more' => $notifications->hasMorePages(),
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

        $notification->update(['is_pinned' => !$notification->is_pinned]);

        return response()->json(['notification' => $notification]);
    }

    public function toggleImportant(Request $request, int $id): JsonResponse
    {
        $notification = AppNotification::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->firstOrFail();

        $notification->update(['is_important' => !$notification->is_important]);

        return response()->json(['notification' => $notification]);
    }
}
