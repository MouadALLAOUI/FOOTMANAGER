<?php

namespace App\Domains\Tournament\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TournamentContactMessage extends \App\Domains\Shared\Base\Model
{
    public const STATUS_NEW = 'new';

    public const STATUS_READ = 'read';

    public const STATUS_REPLIED = 'replied';

    public const STATUS_CLOSED = 'closed';

    public const STATUSES = [
        self::STATUS_NEW,
        self::STATUS_READ,
        self::STATUS_REPLIED,
        self::STATUS_CLOSED,
    ];

    protected $fillable = [
        'tournament_id',
        'name',
        'email',
        'phone',
        'subject',
        'message',
        'status',
        'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'status' => 'string',
        ];
    }

    public function tournament(): BelongsTo
    {
        return $this->belongsTo(Tournament::class, 'tournament_id');
    }
}
