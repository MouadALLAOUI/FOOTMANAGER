<?php

namespace App\Domains\Social\Events;

use App\Domains\Social\Models\Follow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserFollowed
{
    use Dispatchable, SerializesModels;

    public function __construct(public Follow $follow) {}
}
