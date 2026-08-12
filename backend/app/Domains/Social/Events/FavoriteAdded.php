<?php

namespace App\Domains\Social\Events;

use App\Domains\Social\Models\Favorite;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FavoriteAdded
{
    use Dispatchable, SerializesModels;

    public function __construct(public Favorite $favorite) {}
}
