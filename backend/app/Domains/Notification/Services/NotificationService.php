<?php

namespace App\Domains\Notification\Services;

use App\Domains\Notification\Models\AppNotification;
use App\Domains\Notification\Models\NotificationPreference;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Every notification type the in-app system can produce.
     */
    public const TYPES = [
        'challenge_received',
        'challenge_accepted',
        'challenge_declined',
        'match_accepted',
        'match_invitation',
        'match_started',
        'match_finished',
        'goal_scored',
        'live_match_started',
        'score_submitted',
        'score_confirmed',
        'score_disputed',
        'new_booking_request',
        'booking_confirmation',
        'booking_cancellation',
        'booking_rejected',
        'booking_completed',
        'reservation_approved',
        'reservation_rejected',
        'cancellation_requested',
        'cancellation_approved',
        'cancellation_rejected',
        'player_application_received',
        'player_application_accepted',
        'player_application_declined',
        'player_invite_received',
        'player_invite_accepted',
        'team_formation_request',
        'team_member_added',
        'team_member_removed',
        'team_position_changed',
        'announcement',
        'new_follower',
        'new_comment',
        'comment_reply',
        'like',
        'player_review',
        'stadium_review',
        'player_awarded_mvp',
        'player_team_request_approved',
        'player_team_request_rejected',
        'report',
        'system',
    ];

    /**
     * Category of every known notification type.
     */
    private const CATEGORY_MAP = [
        'challenge_received' => 'match',
        'challenge_accepted' => 'match',
        'challenge_declined' => 'match',
        'match_accepted' => 'match',
        'match_invitation' => 'match',
        'match_started' => 'match',
        'match_finished' => 'match',
        'goal_scored' => 'match',
        'live_match_started' => 'match',
        'score_submitted' => 'match',
        'score_confirmed' => 'match',
        'score_disputed' => 'match',
        'new_booking_request' => 'booking',
        'booking_confirmation' => 'booking',
        'booking_cancellation' => 'booking',
        'booking_rejected' => 'booking',
        'booking_completed' => 'booking',
        'reservation_approved' => 'booking',
        'reservation_rejected' => 'booking',
        'cancellation_requested' => 'booking',
        'cancellation_approved' => 'booking',
        'cancellation_rejected' => 'booking',
        'player_application_received' => 'recruitment',
        'player_application_accepted' => 'recruitment',
        'player_application_declined' => 'recruitment',
        'player_invite_received' => 'recruitment',
        'player_invite_accepted' => 'recruitment',
        'team_formation_request' => 'recruitment',
        'team_member_added' => 'team',
        'team_member_removed' => 'team',
        'team_position_changed' => 'team',
        'announcement' => 'tournament',
        'new_follower' => 'social',
        'new_comment' => 'social',
        'comment_reply' => 'social',
        'like' => 'social',
        'player_review' => 'social',
        'stadium_review' => 'social',
        'player_awarded_mvp' => 'social',
        'player_team_request_approved' => 'team',
        'player_team_request_rejected' => 'team',
        'report' => 'system',
        'system' => 'system',
    ];

    /**
     * Order in which categories are surfaced in the UI.
     */
    public const CATEGORY_ORDER = ['match', 'booking', 'tournament', 'recruitment', 'team', 'social', 'system'];

    /**
     * Mandatory system categories — users must always receive them in-app.
     */
    public const SYSTEM_TYPES = ['system', 'report'];

    /**
     * Create an in-app notification for a user.
     *
     * Respects the user's in-app preference for the type (system types are
     * always delivered). A delivery failure never throws — the failure is
     * logged and the business action proceeds.
     */
    public static function push(
        int $userId,
        string $type,
        string $title,
        ?string $body = '',
        array $data = [],
        ?string $actionUrl = null,
        bool $important = false,
        bool $pinned = false,
    ): ?AppNotification {
        try {
            if (! (new self)->channelEnabled($userId, $type, 'database')) {
                return null;
            }

            return AppNotification::query()->create([
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
        } catch (\Throwable $e) {
            Log::error('Notification delivery failed', [
                'user_id' => $userId,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

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
        self::push($userId, $type, $title, $body, $data, $actionUrl, $important, $pinned);
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
        if (in_array($type, self::SYSTEM_TYPES, true)) {
            return true;
        }

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

    public static function categoryOf(string $type): string
    {
        return self::CATEGORY_MAP[$type] ?? 'system';
    }

    /**
     * Ordered, non-empty categories present in the current type registry.
     */
    public static function categories(): array
    {
        $categories = [];

        foreach (self::CATEGORY_ORDER as $category) {
            if (self::typesInCategory($category) !== []) {
                $categories[] = $category;
            }
        }

        return $categories;
    }

    public static function typesInCategory(string $category): array
    {
        return array_values(array_filter(self::TYPES, fn (string $type): bool => self::categoryOf($type) === $category));
    }
}
