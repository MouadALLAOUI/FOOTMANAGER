<?php

namespace App\Domains\Notification\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

/**
 * Generic browser (Web Push / VAPID) notification.
 *
 * Role-agnostic: it is routed via the `webpush` channel to every push
 * subscription owned by the target notifiable (any User, any role), so it is
 * reusable by any feature without rebuilding subscription handling. Multiple
 * subscriptions per user (multiple devices/browsers) all receive the message.
 */
class WebPushNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $title,
        public string $body = '',
        public ?string $url = null,
        public array $payload = [],
    ) {}

    /**
     * Deliver through the WebPush channel only.
     */
    public function via(object $notifiable): array
    {
        return [WebPushChannel::class];
    }

    /**
     * @return WebPushMessage
     */
    public function toWebPush(object $notifiable, ?Notification $notification = null): WebPushMessage
    {
        return (new WebPushMessage)
            ->title($this->title)
            ->body($this->body)
            ->dir('rtl')
            ->data([
                'url' => $this->url,
                ...$this->payload,
            ]);
    }
}
