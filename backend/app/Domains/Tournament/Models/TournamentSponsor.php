<?php

namespace App\Domains\Tournament\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class TournamentSponsor extends \App\Domains\Shared\Base\Model
{
    use HasFactory;

    protected $fillable = [
        'tournament_id',
        'name',
        'logo_path',
        'logo_thumbnail_path',
        'link',
        'level',
        'order_index',
    ];

    protected $appends = ['logo_url'];

    protected function casts(): array
    {
        return [
            'order_index' => 'integer',
        ];
    }

    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo_path
            ? Storage::disk('public')->url($this->logo_path)
            : null;
    }

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class, 'tournament_id');
    }
}
