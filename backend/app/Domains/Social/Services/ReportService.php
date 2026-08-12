<?php

namespace App\Domains\Social\Services;

use App\Domains\Review\Models\PlayerReview;
use App\Domains\Review\Models\StadiumReview;
use App\Domains\Social\Events\ReviewReported;
use App\Domains\Social\Models\Report;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class ReportService
{
    public function report(User $reporter, Model $target, string $reason, ?string $details = null): Report
    {
        $report = Report::query()->create([
            'reporter_id' => $reporter->id,
            'reportable_type' => $target->getMorphClass(),
            'reportable_id' => $target->getKey(),
            'reason' => $reason,
            'details' => $details,
            'status' => Report::STATUS_PENDING,
        ]);

        if ($target instanceof PlayerReview
            || $target instanceof StadiumReview) {
            ReviewReported::dispatch($report);
        }

        return $report;
    }

    public function resolve(User $admin, Report $report, string $status): Report
    {
        $report->update([
            'status' => $status,
            'moderated_by' => $admin->id,
            'moderated_at' => now(),
        ]);

        return $report;
    }

    public function hideContent(User $admin, Model $target): Model
    {
        $this->setStatus($target, 'hidden');

        return $target;
    }

    public function unhideContent(User $admin, Model $target): Model
    {
        $this->setStatus($target, 'active');

        return $target;
    }

    protected function setStatus(Model $target, string $status): void
    {
        if (method_exists($target, 'update') && in_array('status', $target->getFillable(), true)) {
            $target->update(['status' => $status]);
        }
    }
}
