<?php

namespace App\Domains\Subscription\Enums;

enum FeatureScope: string
{
    case Manager = 'manager';
    case Player = 'player';
    case TerrainOwner = 'terrain_owner';
    case Committee = 'committee';
    case Platform = 'platform';
    case Shared = 'shared';
}
