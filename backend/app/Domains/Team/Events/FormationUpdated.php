<?php

namespace App\Domains\Team\Events;

use App\Domains\Team\Models\Team;
use App\Domains\Team\Models\TeamFormation;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FormationUpdated
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Team $team,
        public TeamFormation $formation,
    ) {}
}
