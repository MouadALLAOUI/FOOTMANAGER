<?php

namespace App\Domains\Shared\Base;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model as EloquentModel;

abstract class Model extends EloquentModel
{
    use HasFactory;

    protected $guarded = [];
}
