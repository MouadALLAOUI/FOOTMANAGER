<?php

namespace App\Domains\Tournament\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class TournamentGalleryImage extends \App\Domains\Shared\Base\Model
{
    use HasFactory;

    protected $fillable = [
        'tournament_id',
        'image_path',
        'thumbnail_path',
        'caption',
        'order_index',
        'created_by',
    ];

    protected $appends = ['image_url', 'thumbnail_url'];

    protected function casts(): array
    {
        return [
            'order_index' => 'integer',
        ];
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path
            ? Storage::disk('public')->url($this->image_path)
            : null;
    }

    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->thumbnail_path
            ? Storage::disk('public')->url($this->thumbnail_path)
            : null;
    }

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class, 'tournament_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
