<?php

namespace App\Domains\Player\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class PlayerGalleryImage extends Model
{
    use HasFactory;

    public const CATEGORY_TRAINING = 'training';

    public const CATEGORY_MATCHES = 'matches';

    public const CATEGORY_AWARDS = 'awards';

    public const CATEGORY_PROFILE = 'profile';

    public const CATEGORY_COVER = 'cover';

    protected $fillable = [
        'user_id',
        'image_path',
        'thumbnail_path',
        'category',
        'caption',
        'is_cover',
        'order_index',
    ];

    protected $appends = ['image_url', 'thumbnail_url'];

    protected function casts(): array
    {
        return [
            'is_cover' => 'boolean',
            'order_index' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getImageUrlAttribute(): ?string
    {
        if (! $this->image_path) {
            return null;
        }

        if (str_starts_with($this->image_path, 'http')) {
            return $this->image_path;
        }

        return Storage::disk('public')->url($this->image_path);
    }

    public function getThumbnailUrlAttribute(): ?string
    {
        if (! $this->thumbnail_path) {
            return null;
        }

        if (str_starts_with($this->thumbnail_path, 'http')) {
            return $this->thumbnail_path;
        }

        return Storage::disk('public')->url($this->thumbnail_path);
    }
}
