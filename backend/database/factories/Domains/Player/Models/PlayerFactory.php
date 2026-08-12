<?php

namespace Database\Factories\Domains\Player\Models;

use App\Domains\Player\Models\Player;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PlayerFactory extends Factory
{
    protected $model = Player::class;

    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'user_id' => User::factory(),
            'name' => fake()->name(),
            'position' => fake()->randomElement(['goalkeeper', 'defender', 'midfielder', 'forward']),
            'preferred_position' => null,
            'number' => fake()->numberBetween(1, 99),
            'phone' => fake()->unique()->numerify('06########'),
            'is_whatsapp' => true,
            'role' => Player::ROLE_STARTER,
            'preferred_foot' => fake()->randomElement(['right', 'left']),
            'height_cm' => fake()->numberBetween(160, 200),
            'weight_kg' => fake()->numberBetween(55, 100),
            'status' => Player::STATUS_ACTIVE,
            'emergency_contact' => null,
            'medical_notes' => null,
            'joined_at' => now()->toDateString(),
            'notes' => null,
        ];
    }
}
