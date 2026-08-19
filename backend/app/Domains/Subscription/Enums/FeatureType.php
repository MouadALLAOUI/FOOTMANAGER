<?php

namespace App\Domains\Subscription\Enums;

enum FeatureType: string
{
    case Boolean = 'boolean';
    case Limit = 'limit';
}
