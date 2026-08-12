<?php

namespace App\Domains\Booking\Models;

use App\Domains\Stadium\Models\Stadium;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TerrainSlotClosure extends Model
{
    protected $fillable = [
        'terrain_id',
        'closure_date',
        'start_time',
        'end_time',
        'reason',
    ];

    protected function casts(): array
    {
        return [
            'closure_date' => 'date',
        ];
    }

    public function terrain(): BelongsTo
    {
        return $this->belongsTo(Stadium::class, 'terrain_id');
    }
}
