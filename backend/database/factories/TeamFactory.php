<?php

namespace Database\Factories;

use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TeamFactory extends Factory
{
    protected $model = Team::class;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true) . ' FC',
            'member_count' => fake()->numberBetween(11, 25),
            'category' => fake()->randomElement(['adult', 'teenager', 'children']),
            'association_name' => null,
            'logo_url' => null,
            'points' => 0,
            'matches_played' => 0,
            'wins' => 0,
            'draws' => 0,
            'losses' => 0,
            'goals_for' => 0,
            'goals_against' => 0,
            'goal_difference' => 0,
            'manager_id' => User::factory(),
        ];
    }
}
