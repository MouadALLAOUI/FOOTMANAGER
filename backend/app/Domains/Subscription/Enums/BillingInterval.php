<?php

namespace App\Domains\Subscription\Enums;

enum BillingInterval: string
{
    case Monthly = 'monthly';
    case Yearly = 'yearly';
}
