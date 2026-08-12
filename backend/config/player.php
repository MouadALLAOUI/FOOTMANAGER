<?php

return [
    'gallery' => [
        'max_images' => 20,
        'allowed_mimes' => ['jpeg', 'png', 'jpg', 'webp'],
        'max_size_kb' => 4096,
    ],
    'cache' => [
        'statistics_ttl' => 300,
        'leaderboard_ttl' => 300,
        'dashboard_ttl' => 300,
        'search_profile_ttl' => 300,
    ],
    'overall_rating' => [
        'rating_weight' => 60,
        'win_rate_weight' => 25,
        'achievement_weight' => 15,
    ],
    'achievements' => [
        'top_scorer_goals' => 30,
        'best_playmaker_assists' => 20,
        'mvp_count' => 10,
        'iron_man_matches' => 80,
        'winning_streak' => 5,
    ],
    'notification_preferences' => [
        'application_updates' => true,
        'invitations' => true,
        'upcoming_matches' => true,
        'achievements' => true,
        'reminders' => true,
    ],
];
