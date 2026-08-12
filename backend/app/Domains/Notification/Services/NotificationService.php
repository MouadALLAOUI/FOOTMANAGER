<?php

namespace App\Domains\Notification\Services;

use App\Domains\Notification\Models\AppNotification;
use App\Domains\Notification\Models\NotificationPreference;

class NotificationService
{
    public const TYPES = [
        'new_follower',
        'new_comment',
        'comment_reply',
        'like',
        'player_review',
        'stadium_review',
        'match_invitation',
        'booking_confirmation',
        'booking_cancellation',
        'goal_scored',
        'live_match_started',
        'announcement',
        'report',
        'match_finished',
        'match_started',
        'new_booking_request',
        'booking_rejected',
        'player_awarded_mvp',
        'system',
    ];

    public function notify(
        int $userId,
        string $type,
        string $title,
        string $body = '',
        array $data = [],
        ?string $actionUrl = null,
        bool $important = false,
        bool $pinned = false,
    ): void {
        if (! $this->channelEnabled($userId, $type, 'database')) {
            return;
        }

        AppNotification::query()->create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'data' => $data,
            'action_url' => $actionUrl,
            'is_read' => false,
            'is_pinned' => $pinned,
            'is_important' => $important,
        ]);
    }

    public function notifyMany(
        iterable $userIds,
        string $type,
        string $title,
        string $body = '',
        array $data = [],
        ?string $actionUrl = null,
    ): void {
        foreach ($userIds as $userId) {
            $this->notify((int) $userId, $type, $title, $body, $data, $actionUrl);
        }
    }

    public function unreadCount(int $userId): int
    {
        return (int) AppNotification::query()
            ->where('user_id', $userId)
            ->where('is_read', false)
            ->count();
    }

    public function markAllAsRead(int $userId): void
    {
        AppNotification::query()
            ->where('user_id', $userId)
            ->where('is_read', false)
            ->update(['is_read' => true]);
    }

    public function delete(int $userId, int $notificationId): void
    {
        AppNotification::query()
            ->where('user_id', $userId)
            ->where('id', $notificationId)
            ->delete();
    }

    public function channelEnabled(int $userId, string $type, string $channel): bool
    {
        $preference = NotificationPreference::query()
            ->where('user_id', $userId)
            ->where('type', $type)
            ->first();

        if ($preference) {
            return (bool) $preference->getAttribute($channel.'_enabled');
        }

        $default = NotificationPreference::query()
            ->where('user_id', $userId)
            ->where('type', '*')
            ->first();

        if ($default) {
            return (bool) $default->getAttribute($channel.'_enabled');
        }

        return true;
    }

    public function types(): array
    {
        return self::TYPES;
    }
}
