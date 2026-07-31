<?php

namespace Database\Factories;

use App\Models\MatchRequest;
use App\Models\Team;
use App\Models\Stadium;
use Illuminate\Database\Eloquent\Factories\Factory;

class MatchRequestFactory extends Factory
{
    protected $model = MatchRequest::class;

    public function definition(): array
    {
        return [
            'host_team_id' => Team::factory(),
            'opponent_team_id' => null,
            'stadium_id' => Stadium::factory(),
            'match_datetime' => fake()->dateTimeBetween('+1 days', '+30 days'),
            'status' => 'open',
            'notes' => null,
            'price_per_player' => null,
        ];
    }
}
