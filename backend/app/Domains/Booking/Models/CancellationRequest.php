<?php

namespace App\Domains\Booking\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CancellationRequest extends Model
{
    protected $fillable = [
        'terrain_booking_id',
        'user_id',
        'reason',
        'status',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(TerrainBooking::class, 'terrain_booking_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
