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
 * Notify every approval-capable admin/sub_admin that a new user signed up and
 * is waiting for approval. Queued so the signup request cycle is never blocked.
 */
class NotifyAdminsNewSignupPush implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 30;

    public function __construct(
        public string $type,
        public string $name,
        public ?string $email,
        public ?string $phone,
    ) {}

    public function handle(): void
    {
        $approvalPath = match ($this->type) {
            'terrain_owner' => '/admin/terrain-owners',
            'player' => '/admin/players',
            'committee' => '/admin/committees',
            default => '/admin/managers',
        };

        $link = $this->appUrl().$approvalPath;

        // Every admin always, plus sub_admins granted user-management access.
        $admins = User::whereIn('role', ['admin', 'sub_admin'])->get();

        foreach ($admins as $admin) {
            if ($admin->isSubAdmin() && ! $admin->hasPermission('users.view')) {
                continue;
            }

            WebPushService::sendToUser(
                $admin,
                'طلب انضمام جديد',
                sprintf('%s (%s) بانتظار موافقتك', $this->name, $this->email ?? $this->phone ?? 'حساب جديد'),
                $link,
                ['type' => $this->type],
            );

            NotificationService::push(
                userId: $admin->id,
                type: 'system',
                title: 'طلب انضمام جديد',
                body: sprintf('%s (%s) بانتظار موافقتك', $this->name, $this->email ?? $this->phone ?? 'حساب جديد'),
                actionUrl: $link,
                important: true,
            );
        }
    }

    private function appUrl(): string
    {
        return rtrim((string) config('cors.allowed_origins.0', config('app.url')), '/');
    }
}
