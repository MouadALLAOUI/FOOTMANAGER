<?php

namespace App\Domains\Subscription\Enums;

enum SubscriptionStatus: string
{
    case Active = 'active';
    case Pending = 'pending';
    case Expired = 'expired';
    case Cancelled = 'cancelled';
}
