<?php

namespace Tests\Feature\Subscription;

use App\Domains\Subscription\Enums\DiscountType;
use App\Domains\Subscription\Enums\SubscriptionStatus;
use App\Domains\Subscription\Models\Plan;
use App\Domains\Subscription\Models\PlanDiscount;
use App\Domains\Subscription\Models\Subscription;
use App\Models\User;
use Database\Seeders\FeatureSeeder;
use Database\Seeders\PlanFeatureSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\StreamsProgress;
use Tests\TestCase;

class SubscriptionEndpointsTest extends TestCase
{
    use RefreshDatabase;
    use StreamsProgress;

    private function seedFoundation(): void
    {
        $this->step('seeding plans, features and plan-feature pivots');
        $this->seed([PlanSeeder::class, FeatureSeeder::class, PlanFeatureSeeder::class]);
    }

    private function subscribe(User $user, string $planSlug): Subscription
    {
        $plan = Plan::where('slug', $planSlug)->first();

        return Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'starts_at' => now(),
            'ends_at' => now()->addMonth(),
            'price_at_start' => $plan->price,
            'currency' => $plan->currency,
            'billing_interval' => $plan->billing_interval,
        ]);
    }

    public function test_public_plans_endpoint_lists_active_plans_with_features(): void
    {
        $this->seedFoundation();

        $response = $this->getJson('/api/v1/plans');

        $this->note('GET /api/v1/plans returned '.$response->getStatusCode());

        $response->assertOk()
            ->assertJsonCount(3, 'plans')
            ->assertJsonPath('plans.0.slug', 'bronze')
            ->assertJsonPath('plans.0.price', '0.00')
            ->assertJsonPath('plans.0.final_price', '0.00')
            ->assertJsonPath('plans.0.discount', null)
            ->assertJsonPath('plans.2.slug', 'platinum');

        $keys = collect($response->json('plans.0.features'))->pluck('key')->all();

        $this->assertContains('friendly_match_requests', $keys);
        $this->assertSame(2, collect($response->json('plans.0.features'))->firstWhere('key', 'friendly_match_requests')['value']);
        $this->assertNull(collect($response->json('plans.2.features'))->firstWhere('key', 'friendly_match_requests')['value']);
    }

    public function test_me_subscription_requires_authentication(): void
    {
        $this->seedFoundation();

        $this->getJson('/api/me/subscription')->assertUnauthorized();

        $this->note('unauthenticated request rejected');
    }

    public function test_me_subscription_returns_free_plan_and_usage_without_subscription(): void
    {
        $this->seedFoundation();

        $user = User::factory()->approved()->create();
        Sanctum::actingAs($user);

        $this->note('acting as approved user without a subscription');

        $response = $this->getJson('/api/me/subscription');

        $this->note('GET /api/me/subscription returned '.$response->getStatusCode());

        $response->assertOk()
            ->assertJsonPath('subscription', null)
            ->assertJsonPath('plan.slug', 'bronze')
            ->assertJsonPath('usage.0.feature', 'friendly_match_requests')
            ->assertJsonPath('usage.0.limit', 2)
            ->assertJsonPath('usage.0.current_usage', 0)
            ->assertJsonPath('usage.0.allowed', true);
    }

    public function test_me_subscription_reflects_active_gold_subscription(): void
    {
        $this->seedFoundation();

        $this->step('subscribing the user to the gold plan');

        $user = User::factory()->approved()->create();
        $this->subscribe($user, 'gold');
        Sanctum::actingAs($user);

        $this->note('GET /api/me/subscription for gold subscriber');

        $response = $this->getJson('/api/me/subscription');

        $response->assertOk()
            ->assertJsonPath('plan.slug', 'gold')
            ->assertJsonPath('subscription.is_active', true)
            ->assertJsonPath('usage.0.limit', 10)
            ->assertJsonPath('usage.0.required_plan', null);

        $this->assertSame(10, collect($response->json('plan.features'))->firstWhere('key', 'friendly_match_requests')['value']);
    }

    public function test_public_plans_exposes_active_discounts_with_final_price(): void
    {
        $this->seedFoundation();

        $this->step('adding an active 20% discount to the gold plan');

        $gold = Plan::where('slug', 'gold')->first();

        PlanDiscount::create([
            'plan_id' => $gold->id,
            'type' => DiscountType::Percentage,
            'value' => 20,
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/v1/plans');

        $this->note('GET /api/v1/plans with a gold discount returned '.$response->getStatusCode());

        $response->assertOk()
            ->assertJsonPath('plans.1.slug', 'gold')
            ->assertJsonPath('plans.1.price', '100.00')
            ->assertJsonPath('plans.1.discount.type', 'percentage')
            ->assertJsonPath('plans.1.discount.value', '20.00')
            ->assertJsonPath('plans.1.final_price', '80.00');
    }

    public function test_inactive_or_out_of_window_discounts_are_hidden(): void
    {
        $this->seedFoundation();

        $gold = Plan::where('slug', 'gold')->first();

        $this->step('creating an inactive fixed discount on gold');

        PlanDiscount::create([
            'plan_id' => $gold->id,
            'type' => DiscountType::Fixed,
            'value' => 30,
            'is_active' => false,
        ]);

        $this->getJson('/api/v1/plans')
            ->assertOk()
            ->assertJsonPath('plans.1.discount', null)
            ->assertJsonPath('plans.1.final_price', '100.00');

        $this->note('activating the discount but pushing it out of its window');

        PlanDiscount::where('plan_id', $gold->id)->update([
            'is_active' => true,
            'starts_at' => now()->subDays(10),
            'ends_at' => now()->subDay(),
        ]);

        $this->getJson('/api/v1/plans')
            ->assertOk()
            ->assertJsonPath('plans.1.discount', null)
            ->assertJsonPath('plans.1.final_price', '100.00');
    }

    public function test_me_subscription_includes_discount_of_current_plan(): void
    {
        $this->seedFoundation();

        $gold = Plan::where('slug', 'gold')->first();

        PlanDiscount::create([
            'plan_id' => $gold->id,
            'type' => DiscountType::Percentage,
            'value' => 20,
            'is_active' => true,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDays(10),
        ]);

        $user = User::factory()->approved()->create();
        $this->subscribe($user, 'gold');
        Sanctum::actingAs($user);

        $this->note('GET /api/me/subscription for a gold subscriber with a discount');

        $this->getJson('/api/me/subscription')
            ->assertOk()
            ->assertJsonPath('plan.slug', 'gold')
            ->assertJsonPath('plan.discount.type', 'percentage')
            ->assertJsonPath('plan.discount.value', '20.00')
            ->assertJsonPath('plan.final_price', '80.00')
            ->assertJsonPath('subscription.is_active', true);
    }

    public function test_me_subscription_marks_platinum_usage_as_unlimited(): void
    {
        $this->seedFoundation();

        $user = User::factory()->approved()->create();
        $this->subscribe($user, 'platinum');
        Sanctum::actingAs($user);

        $this->note('GET /api/me/subscription for platinum subscriber');

        $response = $this->getJson('/api/me/subscription');

        $response->assertOk()
            ->assertJsonPath('plan.slug', 'platinum')
            ->assertJsonPath('usage.0.unlimited', true)
            ->assertJsonPath('usage.0.limit', null);
    }
}
