<?php

namespace Database\Factories\Domains\Match\Models;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
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
