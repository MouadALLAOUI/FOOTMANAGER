<?php

namespace App\Domains\Social\Events;

use App\Domains\Social\Models\Report;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReviewReported
{
    use Dispatchable, SerializesModels;

    public function __construct(public Report $report) {}
}
