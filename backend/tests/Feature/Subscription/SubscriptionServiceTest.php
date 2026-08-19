<?php

namespace Tests\Feature\Subscription;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Subscription\Enums\SubscriptionStatus;
use App\Domains\Subscription\Exceptions\PlanFeatureRequiredException;
use App\Domains\Subscription\Exceptions\PlanLimitReachedException;
use App\Domains\Subscription\Models\Feature;
use App\Domains\Subscription\Models\Plan;
use App\Domains\Subscription\Models\Subscription;
use App\Domains\Subscription\Services\SubscriptionService;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Models\User;
use Database\Seeders\FeatureSeeder;
use Database\Seeders\PlanFeatureSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\StreamsProgress;
use Tests\TestCase;

class SubscriptionServiceTest extends TestCase
{
    use RefreshDatabase;
    use StreamsProgress;

    private function seedFoundation(): void
    {
        $this->step('seeding plans, features and plan-feature pivots');
        $this->seed([PlanSeeder::class, FeatureSeeder::class, PlanFeatureSeeder::class]);
    }

    private function service(): SubscriptionService
    {
        return app(SubscriptionService::class);
    }

    private function subscribe(User $user, string $planSlug, bool $expired = false): Subscription
    {
        $plan = Plan::where('slug', $planSlug)->first();

        return Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'starts_at' => now()->subDays($expired ? 40 : 0),
            'ends_at' => $expired ? now()->subDay() : now()->addMonth(),
            'price_at_start' => $plan->price,
            'currency' => $plan->currency,
            'billing_interval' => $plan->billing_interval,
        ]);
    }

    public function test_current_plan_falls_back_to_free_plan_without_subscription(): void
    {
        $this->seedFoundation();

        $user = User::factory()->approved()->create();

        $this->assertSame('bronze', $this->service()->getCurrentPlan($user)->slug);
        $this->assertNull($this->service()->getActiveSubscription($user));
        $this->assertTrue($this->service()->hasFeature($user, 'friendly_match_requests'));
        $this->assertSame(2, $this->service()->getFeatureValue($user, 'friendly_match_requests'));
        $this->assertFalse($this->service()->hasUnlimitedFeature($user, 'friendly_match_requests'));
    }

    public function test_gold_plan_raises_the_limit(): void
    {
        $this->seedFoundation();

        $user = User::factory()->approved()->create();
        $this->subscribe($user, 'gold');

        $this->assertSame('gold', $this->service()->getCurrentPlan($user)->slug);
        $this->assertSame(10, $this->service()->getFeatureValue($user, 'friendly_match_requests'));
    }

    public function test_platinum_grants_unlimited(): void
    {
        $this->seedFoundation();

        $user = User::factory()->approved()->create();
        $this->subscribe($user, 'platinum');

        $this->note('platinum grants unlimited match requests');

        $this->assertTrue($this->service()->hasUnlimitedFeature($user, 'friendly_match_requests'));
        $this->assertNull($this->service()->getFeatureValue($user, 'friendly_match_requests'));

        $result = $this->service()->canCreateResource($user, 'friendly_match_requests', 999);

        $this->assertTrue($result->allowed);
        $this->assertTrue($result->unlimited);
        $this->assertNull($result->limit);
        $this->assertNull($result->requiredPlan);
    }

    public function test_can_create_resource_allows_usage_below_the_limit(): void
    {
        $this->seedFoundation();

        $user = User::factory()->approved()->create();

        $result = $this->service()->canCreateResource($user, 'friendly_match_requests', 1);

        $this->assertTrue($result->allowed);
        $this->assertSame(2, $result->limit);
        $this->assertSame(1, $result->currentUsage);
        $this->assertFalse($result->unlimited);
        $this->assertNull($result->requiredPlan);
    }

    public function test_can_create_resource_rejects_usage_at_the_limit_and_suggests_upgrade(): void
    {
        $this->seedFoundation();

        $user = User::factory()->approved()->create();

        $result = $this->service()->canCreateResource($user, 'friendly_match_requests', 2);

        $this->assertFalse($result->allowed);
        $this->assertSame('gold', $result->requiredPlan);
    }

    public function test_authorize_throws_plan_limit_reached(): void
    {
        $this->seedFoundation();

        $user = User::factory()->approved()->create();

        $this->expectException(PlanLimitReachedException::class);

        $this->service()->authorizeResource($user, 'friendly_match_requests', 2);
    }

    public function test_authorize_throws_plan_feature_required_when_not_granted(): void
    {
        $this->seedFoundation();

        $user = User::factory()->approved()->create();
        $gold = Plan::where('slug', 'gold')->first();
        $premiumUi = Feature::where('key', 'premium_ui')->first();
        $gold->features()->attach($premiumUi->id, ['enabled' => true, 'value' => null, 'is_unlimited' => false]);

        $this->assertFalse($this->service()->hasFeature($user, 'premium_ui'));

        $this->expectException(PlanFeatureRequiredException::class);

        $this->service()->authorizeResource($user, 'premium_ui', 0);
    }

    public function test_expired_subscription_falls_back_to_free_plan(): void
    {
        $this->seedFoundation();

        $user = User::factory()->approved()->create();
        $this->subscribe($user, 'gold', expired: true);

        $this->assertNull($this->service()->getActiveSubscription($user));
        $this->assertSame('bronze', $this->service()->getCurrentPlan($user)->slug);
        $this->assertSame(2, $this->service()->getFeatureValue($user, 'friendly_match_requests'));
    }

    public function test_effective_features_contain_only_granted_features(): void
    {
        $this->seedFoundation();

        $user = User::factory()->approved()->create();

        $this->note('resolving effective features for a bronze/free user');

        $features = $this->service()->getEffectiveFeatures($user);

        $this->assertArrayHasKey('friendly_match_requests', $features);
        $this->assertArrayNotHasKey('premium_ui', $features);
        $this->assertSame(2, $features['friendly_match_requests']['value']);
    }

    public function test_feature_is_inherited_by_higher_plans_only(): void
    {
        $this->seedFoundation();

        $gold = Plan::where('slug', 'gold')->first();
        $premiumUi = Feature::where('key', 'premium_ui')->first();
        $gold->features()->attach($premiumUi->id, ['enabled' => true, 'value' => null, 'is_unlimited' => false]);

        $bronzeUser = User::factory()->approved()->create();
        $this->subscribe($bronzeUser, 'bronze');

        $goldUser = User::factory()->approved()->create();
        $this->subscribe($goldUser, 'gold');

        $platinumUser = User::factory()->approved()->create();
        $this->subscribe($platinumUser, 'platinum');

        $this->assertFalse($this->service()->hasFeature($bronzeUser, 'premium_ui'));
        $this->assertTrue($this->service()->hasFeature($goldUser, 'premium_ui'));
        $this->assertTrue($this->service()->hasFeature($platinumUser, 'premium_ui'));
    }

    public function test_subscribe_snapshots_plan_price_at_creation(): void
    {
        $this->seedFoundation();

        $user = User::factory()->approved()->create();
        $gold = Plan::where('slug', 'gold')->first();

        $subscription = $this->service()->subscribe($user, $gold);

        $this->note('subscribed via SubscriptionService::subscribe');

        $this->assertTrue($subscription->isActive());
        $this->assertSame('100.00', (string) $subscription->price_at_start);
        $this->assertSame('MAD', $subscription->currency);
        $this->assertSame('monthly', $subscription->billing_interval->value);
        $this->assertSame('gold', $this->service()->getCurrentPlan($user)->slug);
    }

    public function test_subscribe_expires_the_previous_active_subscription(): void
    {
        $this->seedFoundation();

        $user = User::factory()->approved()->create();

        $this->service()->subscribe($user, Plan::where('slug', 'bronze')->first());
        $this->service()->subscribe($user, Plan::where('slug', 'gold')->first());

        $active = $this->service()->getActiveSubscription($user);

        $this->assertNotNull($active);
        $this->assertSame('gold', $active->plan->slug);
        $this->assertSame('gold', $this->service()->getCurrentPlan($user)->slug);
        $this->assertSame(
            1,
            Subscription::query()
                ->where('user_id', $user->id)
                ->where('status', SubscriptionStatus::Active)
                ->count()
        );
    }

    public function test_price_change_keeps_historical_snapshots_for_existing_subscribers(): void
    {
        $this->seedFoundation();

        $userA = User::factory()->approved()->create();
        $userB = User::factory()->approved()->create();
        $gold = Plan::where('slug', 'gold')->first();

        $first = $this->service()->subscribe($userA, $gold);
        $this->assertSame('100.00', (string) $first->price_at_start);

        $gold->update(['price' => 120]);

        $this->note('gold price changed from 100 to 120 after an existing subscription');

        $this->assertSame('100.00', (string) $first->fresh()->price_at_start);
        $this->assertSame('120.00', (string) $gold->fresh()->price);

        $second = $this->service()->subscribe($userB, $gold);

        $this->assertSame('120.00', (string) $second->price_at_start);
        $this->assertSame('100.00', (string) $userA->subscriptions()->first()->price_at_start);
    }

    public function test_current_usage_counts_active_match_requests_by_host_or_opponent(): void
    {
        $this->seedFoundation();

        $user = User::factory()->approved()->create();
        $team = Team::factory()->create(['manager_id' => $user->id]);
        $opponent = Team::factory()->create();

        $this->note('creating match requests: open, accepted, live, cancelled, completed');

        foreach (['open', 'accepted', 'live', 'cancelled', 'completed'] as $status) {
            $hostedByOpponent = $status === 'open';

            MatchRequest::create([
                'host_team_id' => $hostedByOpponent ? $opponent->id : $team->id,
                'opponent_team_id' => $hostedByOpponent ? $team->id : ($status === 'completed' ? $opponent->id : null),
                'match_datetime' => now()->addDay(),
                'status' => $status,
            ]);
        }

        $user->unsetRelation('team');

        $this->note('counting active usage (host or opponent, excluding cancelled/completed)');

        $this->assertSame(3, $this->service()->currentUsage($user, 'friendly_match_requests'));
    }

    public function test_current_usage_counts_owner_terrains(): void
    {
        $this->seedFoundation();

        $owner = User::factory()->terrainOwner()->approved()->create();
        Stadium::factory()->count(2)->create(['owner_id' => $owner->id]);

        $this->note('counting owner terrains');

        $this->assertSame(2, $this->service()->currentUsage($owner, 'terrain_limit'));
    }

    public function test_current_usage_counts_organized_tournaments_excluding_archived(): void
    {
        $this->seedFoundation();

        $committee = User::factory()->committee()->approved()->create();

        $this->note('creating tournaments: draft, in_progress, completed');

        foreach (['draft', 'in_progress', 'completed'] as $index => $status) {
            Tournament::create([
                'uuid' => (string) Str::uuid(),
                'name' => 'tournament-'.$index,
                'slug' => 'tournament-'.$index,
                'organizer_id' => $committee->id,
                'start_date' => now()->toDateString(),
                'status' => $status,
            ]);
        }

        $this->note('counting active tournaments (excluding archived)');

        $this->assertSame(2, $this->service()->currentUsage($committee, 'tournament_limit'));
    }
}
