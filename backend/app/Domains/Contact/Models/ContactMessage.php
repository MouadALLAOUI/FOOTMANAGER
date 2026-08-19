<?php

namespace App\Domains\Contact\Models;

class ContactMessage extends \App\Domains\Shared\Base\Model
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
}
