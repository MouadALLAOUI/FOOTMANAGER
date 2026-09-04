<?php

namespace App\Domains\Notification\Services;

use App\Domains\Notification\Notifications\WebPushNotification;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Generic browser push (Web Push / VAPID) helper, available to every role.
 *
 * This is the shared primitive that any feature calls to notify any user:
 *
 *     WebPushService::sendToUser($user, 'title', 'body', '/some/screen');
 *
 * The underlying Laravel Notification is queued and routed through the
 * WebPushChannel to all of the user's stored subscriptions (any device /
 * browser). Expired subscriptions are pruned automatically by the channel's
 * report handling, so stale records never block delivery nor cause loud
 * failures. When the user has no subscription at all, sending is a clean
 * no-op (never an error).
 */
class WebPushService
{
    /**
     * Send a browser push notification to a single user (any role).
     */
    public static function sendToUser(
        User $user,
        string $title,
        string $body = '',
        ?string $url = null,
        array $payload = [],
    ): void {
        try {
            // No fallback/throwing: if the user has no subscriptions, the
            // channel simply has nothing to deliver to (queued no-op).
            $user->notify(new WebPushNotification($title, $body, $url, $payload));
        } catch (\Throwable $e) {
            // A push delivery failure must never break the business action.
            Log::warning('Web push dispatch failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send the same browser push to many users (any roles).
     */
    public static function sendToUsers(
        iterable $users,
        string $title,
        string $body = '',
        ?string $url = null,
        array $payload = [],
    ): void {
        foreach ($users as $user) {
            if ($user instanceof User) {
                self::sendToUser($user, $title, $body, $url, $payload);
            }
        }
    }

    /**
     * Send a browser push to a user SYNCHRONOUSLY (not queued). Intended for a
     * "test my notifications" action where the user expects immediate feedback,
     * independent of the queue worker. Returns a delivery report per endpoint.
     *
     * @return array<int, array{endpoint:string,status:string,message?:string}>
     */
    public static function sendToUserNow(User $user, string $title, string $body = '', ?string $url = null, array $payload = []): array
    {
        $reports = [];

        try {
            $notification = new WebPushNotification($title, $body, $url, $payload);
            $subscriptions = $user->routeNotificationFor('WebPush', $notification);
            if ($subscriptions->isEmpty()) {
                return $reports;
            }

            Notification::sendNow($user, $notification);

            foreach ($user->pushSubscriptions()->get() as $subscription) {
                $reports[] = [
                    'endpoint' => $subscription->endpoint,
                    'status' => 'sent',
                ];
            }

            return $reports;
        } catch (\Throwable $e) {
            Log::warning('Web push (sync/test) send failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            foreach ($user->pushSubscriptions()->get() as $subscription) {
                $reports[] = [
                    'endpoint' => $subscription->endpoint,
                    'status' => 'failed',
                    'message' => $e->getMessage(),
                ];
            }

            return $reports;
        }
    }
}
