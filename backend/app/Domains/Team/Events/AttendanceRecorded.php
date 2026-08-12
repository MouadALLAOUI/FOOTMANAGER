<?php

namespace App\Domains\Team\Events;

use App\Domains\Team\Models\Attendance;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AttendanceRecorded
{
    use Dispatchable, SerializesModels;

    /**
     * @param  array<int, Attendance>  $records
     */
    public function __construct(
        public Team $team,
        public ?int $matchRequestId,
        public ?string $sessionDate,
        public array $records,
        public User $recorder,
    ) {}
}
