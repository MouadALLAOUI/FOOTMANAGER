<?php

namespace App\Domains\Social\Listeners;

use App\Domains\Notification\Services\NotificationService;
use App\Domains\Social\Events\ReviewReported;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;

class ReviewReportedListener implements ShouldQueue
{
    public function __construct(
        protected NotificationService $notifications,
    ) {}

    public function handle(ReviewReported $event): void
    {
        $adminIds = User::query()
            ->where('role', 'admin')
            ->pluck('id');

        $this->notifications->notifyMany(
            $adminIds,
            'report',
            'بلاغ جديد',
            'تم استلام بلاغ عن مراجعة: '.$event->report->reason,
            ['report_id' => $event->report->id],
            '/admin/moderation',
        );
    }
}
