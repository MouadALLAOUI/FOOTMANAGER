<?php

namespace App\Domains\Stadium\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Facility extends Model
{
    protected $fillable = ['name', 'icon'];

    public function terrains(): BelongsToMany
    {
        return $this->belongsToMany(Stadium::class, 'facility_terrain', 'facility_id', 'terrain_id');
    }
}
