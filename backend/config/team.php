<?php

return [

    'gallery' => [
        'max_images' => 20,
        'allowed_mimes' => ['jpeg', 'png', 'jpg', 'webp'],
        'max_size_kb' => 4096,
    ],

    'squad' => [
        'max_size' => 30,
    ],

    'cache' => [
        'dashboard_ttl' => 300,
        'statistics_ttl' => 300,
    ],

    'announcements' => [
        'max_length' => 2000,
    ],

];
