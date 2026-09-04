<?php

namespace App\Domains\Notification\Jobs;

use App\Domains\Notification\Services\NotificationService;
use App\Domains\Notification\Services\WebPushService;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Notify a specific user that their account was approved/rejected/blocked.
 *
 * Only fires if the target user actually has a stored push subscription; a
 * brand-new pending user who hasn't enabled notifications yet simply won't
 * receive a push (expected, not an error). Queued off the approval request.
 */
class NotifyUserApprovalUpdatePush implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 30;

    public function __construct(
        public int $userId,
        public string $status,
    ) {}

    public function handle(): void
    {
        $user = User::find($this->userId);

        if (! $user) {
            return;
        }

        $loginUrl = rtrim((string) config('cors.allowed_origins.0', config('app.url')), '/').'/login';

        [$title, $body] = match ($this->status) {
            'approved' => ['تم قبول حسابك', 'يمكنك الآن تسجيل الدخول إلى المنصة'],
            'rejected' => ['تم رفض طلب حسابك', 'لم يتم قبول طلب انضمامك'],
            'blocked' => ['تم حظر حسابك', 'تعذّر الدخول إلى حسابك حالياً'],
            'unblocked' => ['تم إعادة تفعيل حسابك', 'يمكنك الآن تسجيل الدخول إلى المنصة'],
            default => ['تحديث حالة حسابك', 'تغيّرت حالة حسابك'],
        };

        WebPushService::sendToUser($user, $title, $body, $loginUrl);

        NotificationService::push(
            userId: $user->id,
            type: 'system',
            title: $title,
            body: $body,
            actionUrl: $loginUrl,
            important: true,
        );
    }
}
