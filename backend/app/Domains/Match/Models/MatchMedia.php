<?php

namespace App\Domains\Match\Models;

use App\Domains\Match\Enums\MatchMediaType;
use App\Domains\Shared\Base\Model;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class MatchMedia extends Model
{
    protected $fillable = [
        'match_id',
        'type',
        'file_path',
        'caption',
        'order_index',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'type' => MatchMediaType::class,
            'order_index' => 'integer',
        ];
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(FootballMatch::class, 'match_id');
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function getUrlAttribute(): ?string
    {
        return $this->file_path ? Storage::disk('public')->url($this->file_path) : null;
    }
}
