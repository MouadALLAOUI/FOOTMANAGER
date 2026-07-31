<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class TerrainImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'terrain_id',
        'image_path',
    ];

    protected $appends = ['image_url'];

    public function terrain(): BelongsTo
    {
        return $this->belongsTo(Stadium::class, 'terrain_id');
    }

    public function getImageUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->image_path);
    }
}
