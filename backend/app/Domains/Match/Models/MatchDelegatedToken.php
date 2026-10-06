<?php

namespace App\Domains\Match\Models;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Shared\Base\Model;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MatchDelegatedToken extends Model
{
    protected $fillable = [
        'fixture_id',
        'token_hash',
        'recorder_name',
        'recorder_phone',
        'first_opened_at',
        'valid_from',
        'valid_until',
        'status',
        'is_revoked',
        'revoked_at',
        'created_by',
        'ip_addresses',
    ];

    protected function casts(): array
    {
        return [
            'first_opened_at' => 'datetime',
            'valid_from' => 'datetime',
            'valid_until' => 'datetime',
            'is_revoked' => 'boolean',
            'revoked_at' => 'datetime',
            'ip_addresses' => 'array',
        ];
    }

    public function fixture(): BelongsTo
    {
        return $this->belongsTo(Fixture::class, 'fixture_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(MatchDelegatedSubmission::class, 'match_delegated_token_id');
    }

    public function isValid(): bool
    {
        if ($this->is_revoked || $this->status === 'revoked' || $this->status === 'approved') {
            return false;
        }

        $now = now();

        if ($this->valid_from && $now->timestamp < $this->valid_from->timestamp) {
            return false;
        }

        if ($this->valid_until && $now->timestamp > $this->valid_until->timestamp) {
            return false;
        }

        return true;
    }
}
