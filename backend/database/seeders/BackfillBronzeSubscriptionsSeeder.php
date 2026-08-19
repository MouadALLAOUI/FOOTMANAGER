<?php

namespace Database\Seeders;

use App\Domains\Subscription\Enums\SubscriptionStatus;
use App\Domains\Subscription\Models\Plan;
use App\Domains\Subscription\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Seeder;

class BackfillBronzeSubscriptionsSeeder extends Seeder
{
    public function run(): void
    {
        $plan = Plan::where('slug', 'bronze')->first();

        if (! $plan) {
            return;
        }

        $users = User::whereIn('role', ['manager', 'terrain_owner', 'player', 'committee'])
            ->whereDoesntHave('subscriptions')
            ->get();

        foreach ($users as $user) {
            Subscription::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'status' => SubscriptionStatus::Active,
                'starts_at' => now(),
                'ends_at' => null,
                'cancelled_at' => null,
                'price_at_start' => $plan->price,
                'currency' => $plan->currency,
                'billing_interval' => $plan->billing_interval,
            ]);
        }
    }
}
