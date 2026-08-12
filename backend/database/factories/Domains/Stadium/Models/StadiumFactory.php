<?php

namespace Database\Factories\Domains\Stadium\Models;

use App\Domains\Stadium\Models\Stadium;
use Illuminate\Database\Eloquent\Factories\Factory;

class StadiumFactory extends Factory
{
    protected $model = Stadium::class;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->company().' - '.fake()->citySuffix(),
            'city' => fake()->randomElement(['الدار البيضاء', 'الرباط', 'مراكش', 'فاس', 'طنجة']),
            'address' => null,
            'capacity' => null,
            'owner_id' => null,
            'type' => 'minifoot',
            'player_format' => '7v7',
            'has_benches' => true,
            'supports_tournaments' => false,
            'has_lighting' => true,
            'has_vestiaires' => true,
            'price_per_team' => 200,
            'total_price' => 400,
            'is_available' => true,
            'google_maps_url' => null,
        ];
    }
}
