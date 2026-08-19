<?php

namespace Tests\Feature\Subscription;

use App\Domains\Subscription\Enums\SubscriptionStatus;
use App\Domains\Subscription\Models\Feature;
use App\Domains\Subscription\Models\Plan;
use App\Domains\Subscription\Models\Subscription;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Database\Seeders\FeatureSeeder;
use Database\Seeders\PlanFeatureSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\StreamsProgress;
use Tests\TestCase;

class AdminPlanManagementTest extends TestCase
{
    use RefreshDatabase;
    use StreamsProgress;

    private function seedFoundation(): void
    {
        $this->step('seeding plans, features and plan-feature pivots');
        $this->seed([PlanSeeder::class, FeatureSeeder::class, PlanFeatureSeeder::class]);
    }

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->approved()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        return $admin;
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

    public function test_admin_can_list_plans_with_features_discount_and_subscriber_counts(): void
    {
        $this->seedFoundation();

        $this->step('subscribing two users to gold and one to bronze');

        $userA = User::factory()->approved()->create();
        $userB = User::factory()->approved()->create();
        $userC = User::factory()->approved()->create();

        $this->subscribe($userA, 'gold');
        $this->subscribe($userB, 'gold');
        $this->subscribe($userC, 'bronze');

        $this->actingAsAdmin();

        $this->note('GET /api/admin/plans');

        $response = $this->getJson('/api/admin/plans');

        $response->assertOk()
            ->assertJsonCount(3, 'plans');

        $plans = collect($response->json('plans'));

        $this->assertSame(3, $plans->count());
        $this->assertSame('bronze', $plans->first()['slug']);
        $this->assertSame('platinum', $plans->last()['slug']);

        $gold = $plans->firstWhere('slug', 'gold');
        $this->assertSame(2, $gold['subscribers_count']);
        $this->assertNull($gold['discount']);

        $bronzeFeatures = collect($plans->firstWhere('slug', 'bronze')['features']);
        $this->assertTrue($bronzeFeatures->contains('key', 'friendly_match_requests'));
        $this->assertSame(2, $bronzeFeatures->firstWhere('key', 'friendly_match_requests')['value']);

        $this->assertGreaterThan(0, count($response->json('features')));
    }

    public function test_plan_management_requires_authentication(): void
    {
        $this->seedFoundation();

        $this->getJson('/api/admin/plans')->assertUnauthorized();
    }

    public function test_non_admin_cannot_access_plan_management(): void
    {
        $this->seedFoundation();

        $manager = User::factory()->approved()->create();
        Sanctum::actingAs($manager);

        $this->note('acting as an approved manager');

        $this->getJson('/api/admin/plans')->assertForbidden();
    }

    public function test_admin_can_create_plan(): void
    {
        $this->seedFoundation();
        $this->actingAsAdmin();

        $this->step('creating a new plan via the admin API');

        $response = $this->postJson('/api/admin/plans', [
            'name' => 'Silver',
            'slug' => 'silver',
            'description' => 'خطة فضية جديدة',
            'price' => 50,
            'currency' => 'MAD',
            'billing_interval' => 'monthly',
            'is_active' => true,
            'display_order' => 4,
            'badge' => 'شائع',
        ]);

        $response->assertCreated()
            ->assertJsonPath('plan.slug', 'silver')
            ->assertJsonPath('plan.price', '50.00');

        $this->assertDatabaseHas('plans', ['slug' => 'silver', 'price' => 50]);
    }

    public function test_duplicate_slug_is_rejected(): void
    {
        $this->seedFoundation();
        $this->actingAsAdmin();

        $this->postJson('/api/admin/plans', [
            'name' => 'Gold Copy',
            'slug' => 'gold',
            'price' => 99,
        ])->assertUnprocessable();

        $this->assertDatabaseCount('plans', 3);
    }

    public function test_negative_price_is_rejected(): void
    {
        $this->seedFoundation();
        $this->actingAsAdmin();

        $this->postJson('/api/admin/plans', [
            'name' => 'Negative',
            'slug' => 'negative',
            'price' => -5,
        ])->assertUnprocessable();

        $this->assertDatabaseCount('plans', 3);
    }

    public function test_non_admin_cannot_modify_plans(): void
    {
        $this->seedFoundation();

        $manager = User::factory()->approved()->create();
        Sanctum::actingAs($manager);

        $gold = Plan::where('slug', 'gold')->first();

        $this->note('acting as an approved manager across every write endpoint');

        $this->putJson("/api/admin/plans/{$gold->id}", ['price' => 5])->assertForbidden();
        $this->patchJson("/api/admin/plans/{$gold->id}/status", ['is_active' => false])->assertForbidden();
        $this->putJson("/api/admin/plans/{$gold->id}/features", [
            'features' => [['feature_id' => 1, 'enabled' => true, 'value' => 1, 'is_unlimited' => false]],
        ])->assertForbidden();
        $this->putJson("/api/admin/plans/{$gold->id}/discount", [
            'type' => 'percentage',
            'value' => 10,
        ])->assertForbidden();
        $this->postJson('/api/admin/plans', ['name' => 'X', 'slug' => 'x', 'price' => 1])->assertForbidden();
        $this->deleteJson("/api/admin/plans/{$gold->id}")->assertForbidden();

        $this->assertSame('100.00', (string) $gold->fresh()->price);
        $this->assertTrue($gold->fresh()->is_active);
    }

    public function test_admin_can_raise_a_limit_and_enforcement_follows_immediately(): void
    {
        $this->seedFoundation();
        $this->actingAsAdmin();

        $this->step('admin raises the gold friendly-match limit from 10 to 15');

        $gold = Plan::where('slug', 'gold')->first();
        $matchRequests = Feature::where('key', 'friendly_match_requests')->first();

        $this->putJson("/api/admin/plans/{$gold->id}/features", [
            'features' => [
                ['feature_id' => $matchRequests->id, 'enabled' => true, 'value' => 15, 'is_unlimited' => false],
            ],
        ])->assertOk();

        $this->step('gold manager can now create 15 match requests');

        $manager = User::factory()->approved()->create(['role' => 'manager']);
        $this->subscribe($manager, 'gold');
        Team::factory()->create(['manager_id' => $manager->id]);

        Sanctum::actingAs($manager);

        for ($i = 1; $i <= 15; $i++) {
            $this->postJson('/api/manager/match-requests', [
                'custom_terrain_name' => 'ملعب اللقاء '.$i,
                'match_datetime' => now()->addDays($i)->addHours(2)->toDateTimeString(),
                'start_time' => '20:00',
            ])->assertCreated();
        }

        $this->postJson('/api/manager/match-requests', [
            'custom_terrain_name' => 'ملعب اللقاء 16',
            'match_datetime' => now()->addDays(16)->addHours(2)->toDateTimeString(),
            'start_time' => '20:00',
        ])
            ->assertStatus(403)
            ->assertJsonPath('error', 'PLAN_LIMIT_REACHED')
            ->assertJsonPath('current_usage', 15)
            ->assertJsonPath('limit', 15)
            ->assertJsonPath('required_plan', 'platinum');

        $this->step('the new limit is reflected in the public pricing and my-subscription APIs');

        $plans = $this->getJson('/api/v1/plans')->assertOk()->json('plans');

        $goldFromApi = collect($plans)->firstWhere('slug', 'gold');
        $this->assertSame(
            15,
            collect($goldFromApi['features'])->firstWhere('key', 'friendly_match_requests')['value']
        );

        $this->getJson('/api/me/subscription')
            ->assertOk()
            ->assertJsonPath('usage.0.limit', 15);
    }

    public function test_admin_can_update_plan(): void
    {
        $this->seedFoundation();
        $this->actingAsAdmin();

        $gold = Plan::where('slug', 'gold')->first();

        $response = $this->putJson("/api/admin/plans/{$gold->id}", [
            'name' => 'Gold Pro',
            'price' => 120,
            'badge' => 'الأكثر مبيعاً',
        ]);

        $response->assertOk()
            ->assertJsonPath('plan.name', 'Gold Pro')
            ->assertJsonPath('plan.price', '120.00');

        $this->assertDatabaseHas('plans', ['id' => $gold->id, 'name' => 'Gold Pro', 'price' => 120]);
    }

    public function test_update_rejects_slug_taken_by_another_plan(): void
    {
        $this->seedFoundation();
        $this->actingAsAdmin();

        $gold = Plan::where('slug', 'gold')->first();

        $this->putJson("/api/admin/plans/{$gold->id}", [
            'slug' => 'platinum',
        ])->assertUnprocessable();
    }

    public function test_admin_can_toggle_plan_status(): void
    {
        $this->seedFoundation();
        $this->actingAsAdmin();

        $gold = Plan::where('slug', 'gold')->first();

        $this->patchJson("/api/admin/plans/{$gold->id}/status", [
            'is_active' => false,
        ])->assertOk()->assertJsonPath('plan.is_active', false);

        $this->assertFalse($gold->fresh()->is_active);

        $this->patchJson("/api/admin/plans/{$gold->id}/status", [
            'is_active' => true,
        ])->assertOk()->assertJsonPath('plan.is_active', true);

        $this->assertTrue($gold->fresh()->is_active);
    }

    public function test_admin_can_sync_features(): void
    {
        $this->seedFoundation();
        $this->actingAsAdmin();

        $gold = Plan::where('slug', 'gold')->first();
        $matchRequests = \App\Domains\Subscription\Models\Feature::where('key', 'friendly_match_requests')->first();
        $advancedStats = \App\Domains\Subscription\Models\Feature::where('key', 'advanced_statistics')->first();

        $this->step('replacing the gold feature set via the admin API');

        $response = $this->putJson("/api/admin/plans/{$gold->id}/features", [
            'features' => [
                ['feature_id' => $matchRequests->id, 'enabled' => true, 'value' => 15, 'is_unlimited' => false],
                ['feature_id' => $advancedStats->id, 'enabled' => true, 'value' => null, 'is_unlimited' => false],
            ],
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('plan_features', [
            'plan_id' => $gold->id,
            'feature_id' => $matchRequests->id,
            'enabled' => true,
            'value' => 15,
            'is_unlimited' => false,
        ]);

        $this->assertSame(
            2,
            \Illuminate\Support\Facades\DB::table('plan_features')->where('plan_id', $gold->id)->count()
        );

        $this->assertSame(
            15,
            collect($response->json('plan.features'))->firstWhere('key', 'friendly_match_requests')['value']
        );
    }

    public function test_sync_features_does_not_create_duplicate_relationships(): void
    {
        $this->seedFoundation();
        $this->actingAsAdmin();

        $gold = Plan::where('slug', 'gold')->first();
        $matchRequests = \App\Domains\Subscription\Models\Feature::where('key', 'friendly_match_requests')->first();

        $this->putJson("/api/admin/plans/{$gold->id}/features", [
            'features' => [
                ['feature_id' => $matchRequests->id, 'enabled' => true, 'value' => 3, 'is_unlimited' => false],
                ['feature_id' => $matchRequests->id, 'enabled' => true, 'value' => 3, 'is_unlimited' => false],
            ],
        ])->assertOk();

        $this->assertSame(
            1,
            \App\Domains\Subscription\Models\PlanFeature::where('plan_id', $gold->id)
                ->where('feature_id', $matchRequests->id)
                ->count()
        );
    }

    public function test_admin_can_save_discount(): void
    {
        $this->seedFoundation();
        $this->actingAsAdmin();

        $gold = Plan::where('slug', 'gold')->first();

        $response = $this->putJson("/api/admin/plans/{$gold->id}/discount", [
            'type' => 'percentage',
            'value' => 20,
            'starts_at' => now()->toDateString(),
            'ends_at' => now()->addDays(10)->toDateString(),
            'is_active' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('plan.discount.type', 'percentage')
            ->assertJsonPath('plan.discount.value', '20.00');

        $this->assertDatabaseHas('plan_discounts', [
            'plan_id' => $gold->id,
            'type' => 'percentage',
            'value' => 20,
            'is_active' => true,
        ]);
    }

    public function test_discount_validation_rules(): void
    {
        $this->seedFoundation();
        $this->actingAsAdmin();

        $gold = Plan::where('slug', 'gold')->first();

        $this->step('discount percentage above 100 is rejected');

        $this->putJson("/api/admin/plans/{$gold->id}/discount", [
            'type' => 'percentage',
            'value' => 150,
        ])->assertUnprocessable();

        $this->step('discount fixed above the base price is rejected');

        $this->putJson("/api/admin/plans/{$gold->id}/discount", [
            'type' => 'fixed',
            'value' => 500,
        ])->assertUnprocessable();

        $this->step('discount with ends_at before starts_at is rejected');

        $this->putJson("/api/admin/plans/{$gold->id}/discount", [
            'type' => 'percentage',
            'value' => 10,
            'starts_at' => now()->addDays(5)->toDateString(),
            'ends_at' => now()->toDateString(),
        ])->assertUnprocessable();

        $this->assertDatabaseCount('plan_discounts', 0);
    }

    public function test_admin_can_reorder_plans(): void
    {
        $this->seedFoundation();
        $this->actingAsAdmin();

        $plans = Plan::orderBy('display_order')->get();
        $ids = $plans->pluck('id')->all();
        $reversed = array_reverse($ids);

        $this->postJson('/api/admin/plans/reorder', [
            'order' => $reversed,
        ])->assertOk();

        foreach ($reversed as $index => $id) {
            $this->assertDatabaseHas('plans', [
                'id' => $id,
                'display_order' => $index + 1,
            ]);
        }
    }

    public function test_plan_with_subscriptions_cannot_be_deleted(): void
    {
        $this->seedFoundation();
        $this->actingAsAdmin();

        $user = User::factory()->approved()->create();
        $this->subscribe($user, 'gold');

        $gold = Plan::where('slug', 'gold')->first();

        $this->deleteJson("/api/admin/plans/{$gold->id}")->assertStatus(409);

        $this->assertDatabaseHas('plans', ['id' => $gold->id]);
    }

    public function test_plan_without_subscriptions_can_be_deleted(): void
    {
        $this->seedFoundation();
        $this->actingAsAdmin();

        $response = $this->postJson('/api/admin/plans', [
            'name' => 'Temporary',
            'slug' => 'temporary',
            'price' => 10,
        ]);

        $planId = $response->json('plan.id');

        $this->deleteJson("/api/admin/plans/{$planId}")->assertOk();

        $this->assertDatabaseMissing('plans', ['id' => $planId]);
    }
}
