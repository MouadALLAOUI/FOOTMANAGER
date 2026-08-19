<?php

namespace Database\Seeders;

use App\Domains\Subscription\Models\Feature;
use App\Domains\Subscription\Models\Plan;
use App\Domains\Subscription\Models\PlanFeature;
use Illuminate\Database\Seeder;

class PlanFeatureSeeder extends Seeder
{
    public function run(): void
    {
        $assignments = [
            'bronze' => [
                'friendly_match_requests' => ['enabled' => true, 'value' => 2, 'is_unlimited' => false],
                'terrain_limit' => ['enabled' => true, 'value' => 1, 'is_unlimited' => false],
                'tournament_limit' => ['enabled' => true, 'value' => 0, 'is_unlimited' => false],
            ],
            'gold' => [
                'friendly_match_requests' => ['enabled' => true, 'value' => 10, 'is_unlimited' => false],
                'terrain_limit' => ['enabled' => true, 'value' => 2, 'is_unlimited' => false],
                'tournament_limit' => ['enabled' => true, 'value' => 1, 'is_unlimited' => false],
                'advanced_statistics' => ['enabled' => true, 'value' => null, 'is_unlimited' => false],
                'landing_visibility' => ['enabled' => true, 'value' => null, 'is_unlimited' => false],
                'player_card' => ['enabled' => true, 'value' => null, 'is_unlimited' => false],
            ],
            'platinum' => [
                'friendly_match_requests' => ['enabled' => true, 'value' => null, 'is_unlimited' => true],
                'terrain_limit' => ['enabled' => true, 'value' => null, 'is_unlimited' => true],
                'tournament_limit' => ['enabled' => true, 'value' => null, 'is_unlimited' => true],
                'advanced_statistics' => ['enabled' => true, 'value' => null, 'is_unlimited' => false],
                'landing_visibility' => ['enabled' => true, 'value' => null, 'is_unlimited' => false],
                'player_card' => ['enabled' => true, 'value' => null, 'is_unlimited' => false],
                'priority_support' => ['enabled' => true, 'value' => null, 'is_unlimited' => false],
                'premium_ui' => ['enabled' => true, 'value' => null, 'is_unlimited' => false],
                'feature_requests' => ['enabled' => true, 'value' => null, 'is_unlimited' => false],
            ],
        ];

        foreach ($assignments as $slug => $features) {
            $plan = Plan::where('slug', $slug)->firstOrFail();

            foreach ($features as $key => $attributes) {
                $feature = Feature::where('key', $key)->firstOrFail();

                PlanFeature::updateOrCreate(
                    ['plan_id' => $plan->id, 'feature_id' => $feature->id],
                    $attributes,
                );
            }
        }
    }
}
