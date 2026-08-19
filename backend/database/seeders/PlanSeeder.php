<?php

namespace Database\Seeders;

use App\Domains\Subscription\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Bronze',
                'slug' => 'bronze',
                'description' => 'الخطة المجانية للمبتدئين',
                'price' => 0,
                'currency' => 'MAD',
                'billing_interval' => 'monthly',
                'is_free' => true,
                'is_active' => true,
                'display_order' => 1,
                'badge' => null,
            ],
            [
                'name' => 'Gold',
                'slug' => 'gold',
                'description' => 'الخطة المتوسطة للمديرين',
                'price' => 100,
                'currency' => 'MAD',
                'billing_interval' => 'monthly',
                'is_free' => false,
                'is_active' => true,
                'display_order' => 2,
                'badge' => null,
            ],
            [
                'name' => 'Platinum',
                'slug' => 'platinum',
                'description' => 'الخطة الكاملة بكل المزايا',
                'price' => 200,
                'currency' => 'MAD',
                'billing_interval' => 'monthly',
                'is_free' => false,
                'is_active' => true,
                'display_order' => 3,
                'badge' => null,
            ],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(['slug' => $plan['slug']], $plan);
        }
    }
}
