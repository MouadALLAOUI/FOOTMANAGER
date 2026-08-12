<?php

namespace App\Domains\Team\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class TeamGalleryImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'team_id',
        'image_path',
        'thumbnail_path',
        'caption',
        'category',
        'uploaded_by',
        'order_index',
        'is_cover',
    ];

    protected function casts(): array
    {
        return [
            'order_index' => 'integer',
            'is_cover' => 'boolean',
        ];
    }

    protected $appends = ['image_url', 'thumbnail_url'];

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

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'team_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
