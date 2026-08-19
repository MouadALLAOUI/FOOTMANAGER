<?php

namespace Tests\Feature\Subscription;

use App\Domains\Subscription\Enums\BillingInterval;
use App\Domains\Subscription\Enums\FeatureScope;
use App\Domains\Subscription\Enums\FeatureType;
use App\Domains\Subscription\Enums\SubscriptionStatus;
use App\Domains\Subscription\Models\Feature;
use App\Domains\Subscription\Models\Plan;
use App\Domains\Subscription\Models\Subscription;
use App\Models\User;
use Database\Seeders\BackfillBronzeSubscriptionsSeeder;
use Database\Seeders\FeatureSeeder;
use Database\Seeders\PlanFeatureSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\StreamsProgress;
use Tests\TestCase;

class SubscriptionFoundationTest extends TestCase
{
    use RefreshDatabase;
    use StreamsProgress;

    private function seedFoundation(): void
    {
        $this->step('seeding plans, features and plan-feature pivots');
        $this->seed([PlanSeeder::class, FeatureSeeder::class, PlanFeatureSeeder::class]);
    }

    public function test_plans_are_created(): void
    {
        $this->seedFoundation();

        $this->assertDatabaseCount('plans', 3);
        $this->assertDatabaseHas('plans', ['slug' => 'bronze', 'price' => 0, 'is_free' => true]);
        $this->assertDatabaseHas('plans', ['slug' => 'gold', 'price' => 100, 'is_free' => false]);
        $this->assertDatabaseHas('plans', ['slug' => 'platinum', 'price' => 200, 'is_free' => false]);

        $gold = Plan::where('slug', 'gold')->first();
        $this->assertSame(BillingInterval::Monthly, $gold->billing_interval);
        $this->assertTrue($gold->is_active);
    }

    public function test_feature_keys_are_unique(): void
    {
        $this->seedFoundation();

        $this->assertDatabaseCount('features', 18);
        $this->assertSame(18, Feature::distinct('key')->count());

        $this->expectException(QueryException::class);

        Feature::create([
            'key' => 'friendly_match_requests',
            'name' => 'مكرر',
            'type' => FeatureType::Limit,
            'scope' => FeatureScope::Manager,
        ]);
    }

    public function test_plan_feature_relationships_work(): void
    {
        $this->seedFoundation();

        $bronze = Plan::where('slug', 'bronze')->first();
        $platinum = Plan::where('slug', 'platinum')->first();

        $this->assertTrue($bronze->features->contains('key', 'friendly_match_requests'));
        $this->assertTrue($bronze->features->contains('key', 'terrain_limit'));
        $this->assertTrue($bronze->features->contains('key', 'tournament_limit'));

        $bronzeMatchRequests = $bronze->features()->where('key', 'friendly_match_requests')->first()->pivot;
        $this->assertTrue($bronzeMatchRequests->enabled);
        $this->assertSame(2, $bronzeMatchRequests->value);
        $this->assertFalse($bronzeMatchRequests->is_unlimited);

        $platinumMatchRequests = $platinum->features()->where('key', 'friendly_match_requests')->first()->pivot;
        $this->assertTrue($platinumMatchRequests->is_unlimited);
        $this->assertNull($platinumMatchRequests->value);

        $feature = Feature::where('key', 'tournament_limit')->first();
        $this->assertTrue($feature->plans->contains('slug', 'bronze'));
        $this->assertTrue($feature->plans->contains('slug', 'gold'));
        $this->assertTrue($feature->plans->contains('slug', 'platinum'));

        $this->assertDatabaseCount('plan_features', 18);
    }

    public function test_subscription_belongs_to_user(): void
    {
        $this->seedFoundation();

        $user = User::factory()->approved()->create();
        $plan = Plan::where('slug', 'gold')->first();

        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'starts_at' => now(),
            'price_at_start' => $plan->price,
            'currency' => $plan->currency,
            'billing_interval' => $plan->billing_interval,
        ]);

        $this->assertTrue($subscription->user->is($user));
        $this->assertTrue($user->subscriptions->contains($subscription));
        $this->assertTrue($user->activeSubscription->is($subscription));
    }

    public function test_subscription_belongs_to_plan(): void
    {
        $this->seedFoundation();

        $user = User::factory()->approved()->create();
        $plan = Plan::where('slug', 'gold')->first();

        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'starts_at' => now(),
            'price_at_start' => $plan->price,
            'currency' => $plan->currency,
            'billing_interval' => $plan->billing_interval,
        ]);

        $this->assertTrue($subscription->plan->is($plan));
        $this->assertTrue($plan->subscriptions->contains($subscription));
        $this->assertSame('gold', $user->currentPlan()->slug);
    }

    public function test_historical_price_is_stored(): void
    {
        $this->seedFoundation();

        $user = User::factory()->approved()->create();
        $plan = Plan::where('slug', 'gold')->first();

        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'starts_at' => now(),
            'price_at_start' => 100,
            'currency' => 'MAD',
            'billing_interval' => BillingInterval::Monthly,
        ]);

        $plan->update(['price' => 120]);

        $this->assertSame('100.00', $subscription->fresh()->price_at_start);
        $this->assertSame('120.00', $plan->fresh()->price);
    }

    public function test_seeders_are_idempotent(): void
    {
        $this->step('running the plan seeders twice');

        $this->seedFoundation();
        $this->seedFoundation();

        $this->assertDatabaseCount('plans', 3);
        $this->assertDatabaseCount('features', 18);
        $this->assertDatabaseCount('plan_features', 18);
    }

    public function test_existing_users_are_backfilled_to_bronze(): void
    {
        $this->step('creating three approved users');

        $users = User::factory()->approved()->count(3)->create();

        $this->note('running the backfill seeder');

        $this->seed([PlanSeeder::class, FeatureSeeder::class, PlanFeatureSeeder::class, BackfillBronzeSubscriptionsSeeder::class]);

        $this->assertDatabaseCount('subscriptions', 3);

        foreach ($users as $user) {
            $this->assertSame('bronze', $user->fresh()->currentPlan()->slug);
            $this->assertSame('active', $user->fresh()->activeSubscription->status->value);
        }
    }

    public function test_backfill_does_not_duplicate_subscriptions(): void
    {
        $user = User::factory()->approved()->create();

        $seeders = [PlanSeeder::class, FeatureSeeder::class, PlanFeatureSeeder::class, BackfillBronzeSubscriptionsSeeder::class];

        $this->seed($seeders);
        $this->seed($seeders);

        $this->assertSame(1, $user->fresh()->subscriptions->count());
    }
}
