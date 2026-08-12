<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Public cache TTLs (seconds)
    |--------------------------------------------------------------------------
    |
    | TTLs for the legacy public read endpoints. Mutations flush their segment
    | through App\Domains\Shared\Support\PublicCache, so these act as safety
    | nets rather than the primary invalidation mechanism.
    |
    */

    'cache' => [
        'team_leaderboard_ttl' => 300,
        'player_leaderboard_ttl' => 300,
        'facilities_ttl' => 3600,
        'settings_ttl' => 300,
        'terrains_ttl' => 300,
    ],
];
