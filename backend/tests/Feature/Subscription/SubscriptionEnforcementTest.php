<?php

namespace Tests\Feature\Subscription;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Subscription\Enums\SubscriptionStatus;
use App\Domains\Subscription\Models\Plan;
use App\Domains\Subscription\Models\Subscription;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Database\Seeders\FeatureSeeder;
use Database\Seeders\PlanFeatureSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\StreamsProgress;
use Tests\TestCase;

class SubscriptionEnforcementTest extends TestCase
{
    use RefreshDatabase;
    use StreamsProgress;

    protected function setUp(): void
    {
        parent::setUp();

        $this->step('seeding plans, features and plan-feature pivots');
        $this->seed([PlanSeeder::class, FeatureSeeder::class, PlanFeatureSeeder::class]);
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

    private function managerWithTeam(string $planSlug = null): array
    {
        $manager = User::factory()->approved()->create(['role' => 'manager']);

        if ($planSlug) {
            $this->subscribe($manager, $planSlug);
        }

        $team = Team::factory()->create(['manager_id' => $manager->id]);

        return [$manager, $team];
    }

    private function matchRequestPayload(int $dayOffset = 1): array
    {
        return [
            'custom_terrain_name' => 'ملعب اللقاء '.$dayOffset,
            'match_datetime' => now()->addDays($dayOffset)->addHours(2)->toDateTimeString(),
            'start_time' => '20:00',
        ];
    }

    private function terrainPayload(): array
    {
        return [
            'name' => 'ملعب أصيل',
            'city' => 'الدار البيضاء',
            'type' => 'salle',
            'player_format' => '7v7',
            'price_per_team' => 250,
        ];
    }

    private function tournamentPayload(): array
    {
        return [
            'name' => 'بطولة الأحياء '.uniqid(),
            'edition' => '1',
            'category' => 'أكابر',
            'location' => 'مدينة',
            'start_date' => now()->addMonth()->toDateString(),
            'end_date' => now()->addMonth()->addWeeks(2)->toDateString(),
            'tournament_format' => 'groups_knockout',
            'teams_count' => 8,
            'groups_count' => 2,
            'teams_per_group' => 4,
            'knockout_teams' => 4,
            'points_for_win' => 3,
            'points_for_draw' => 1,
            'points_for_loss' => 0,
        ];
    }

    public function test_bronze_can_keep_two_active_match_requests_only(): void
    {
        $this->step('bronze: creating up to two match requests');

        [$manager] = $this->managerWithTeam('bronze');

        $this->actingAs($manager)
            ->postJson('/api/manager/match-requests', $this->matchRequestPayload(1))
            ->assertCreated();
        $this->actingAs($manager)
            ->postJson('/api/manager/match-requests', $this->matchRequestPayload(2))
            ->assertCreated();

        $this->actingAs($manager)
            ->postJson('/api/manager/match-requests', $this->matchRequestPayload(3))
            ->assertStatus(403)
            ->assertJsonPath('error', 'PLAN_LIMIT_REACHED')
            ->assertJsonPath('current_usage', 2)
            ->assertJsonPath('limit', 2)
            ->assertJsonPath('required_plan', 'gold');

        $this->assertSame(2, MatchRequest::where('host_team_id', $manager->team->id)->count());
    }

    public function test_gold_raises_the_active_match_request_capacity_to_ten(): void
    {
        $this->step('gold: creating ten match requests');

        [$manager] = $this->managerWithTeam('gold');

        for ($i = 1; $i <= 10; $i++) {
            $this->actingAs($manager)
                ->postJson('/api/manager/match-requests', $this->matchRequestPayload($i))
                ->assertCreated();
        }

        $this->actingAs($manager)
            ->postJson('/api/manager/match-requests', $this->matchRequestPayload(11))
            ->assertStatus(403)
            ->assertJsonPath('error', 'PLAN_LIMIT_REACHED');
    }

    public function test_platinum_allows_unlimited_match_requests(): void
    {
        $this->step('platinum: creating four match requests');

        [$manager] = $this->managerWithTeam('platinum');

        for ($i = 1; $i <= 4; $i++) {
            $this->actingAs($manager)
                ->postJson('/api/manager/match-requests', $this->matchRequestPayload($i))
                ->assertCreated();
        }
    }

    public function test_finished_or_cancelled_requests_do_not_consume_the_quota(): void
    {
        $this->step('bronze: cancelled and completed requests free the quota');

        [$manager, $team] = $this->managerWithTeam('bronze');

        MatchRequest::create([
            'host_team_id' => $team->id,
            'match_datetime' => now()->addDays(5),
            'status' => 'cancelled',
        ]);
        MatchRequest::create([
            'host_team_id' => $team->id,
            'match_datetime' => now()->addDays(6),
            'status' => 'completed',
        ]);

        $this->actingAs($manager)
            ->postJson('/api/manager/match-requests', $this->matchRequestPayload(1))
            ->assertCreated();
    }

    public function test_accepting_an_open_request_checks_the_accepting_team_limit(): void
    {
        $this->step('bronze: accepting a request checks the accepting team quota');

        [$hostManager, $hostTeam] = $this->managerWithTeam('bronze');
        [$acceptingManager, $acceptingTeam] = $this->managerWithTeam('bronze');

        MatchRequest::create([
            'host_team_id' => $acceptingTeam->id,
            'match_datetime' => now()->addDays(5),
            'status' => 'open',
        ]);
        MatchRequest::create([
            'host_team_id' => $acceptingTeam->id,
            'match_datetime' => now()->addDays(6),
            'status' => 'open',
        ]);

        $challenge = $this->actingAs($hostManager)
            ->postJson('/api/manager/challenges', [
                'target_team_id' => $acceptingTeam->id,
                'custom_terrain_name' => 'ملعب التحدي',
                'match_datetime' => now()->addDays(7)->toDateTimeString(),
            ])
            ->assertCreated()
            ->json('match_request');

        $this->actingAs($acceptingManager)
            ->postJson('/api/manager/match-requests/'.$challenge['id'].'/accept')
            ->assertStatus(403)
            ->assertJsonPath('error', 'PLAN_LIMIT_REACHED')
            ->assertJsonPath('current_usage', 2);

        $this->assertSame('open', MatchRequest::find($challenge['id'])->status);
    }

    public function test_plan_id_sent_from_the_client_is_never_trusted(): void
    {
        $this->step('client-supplied plan_id is ignored');

        [$manager] = $this->managerWithTeam('bronze');

        $this->actingAs($manager)
            ->postJson('/api/manager/match-requests', $this->matchRequestPayload(1))
            ->assertCreated();
        $this->actingAs($manager)
            ->postJson('/api/manager/match-requests', $this->matchRequestPayload(2))
            ->assertCreated();

        $platinum = Plan::where('slug', 'platinum')->first();

        $this->actingAs($manager)
            ->postJson('/api/manager/match-requests', $this->matchRequestPayload(3) + ['plan_id' => $platinum->id])
            ->assertStatus(403)
            ->assertJsonPath('error', 'PLAN_LIMIT_REACHED');
    }

    public function test_terrain_limit_is_enforced_per_plan(): void
    {
        $this->step('bronze: terrain limit is one');

        $bronze = User::factory()->terrainOwner()->approved()->create();
        $this->subscribe($bronze, 'bronze');

        $this->actingAs($bronze)
            ->postJson('/api/owner/terrains', $this->terrainPayload())
            ->assertCreated();

        $this->actingAs($bronze)
            ->postJson('/api/owner/terrains', $this->terrainPayload())
            ->assertStatus(403)
            ->assertJsonPath('error', 'PLAN_LIMIT_REACHED')
            ->assertJsonPath('current_usage', 1)
            ->assertJsonPath('limit', 1)
            ->assertJsonPath('required_plan', 'gold');
    }

    public function test_gold_owner_keeps_two_terrains_and_is_blocked_on_the_third(): void
    {
        $this->step('gold: two terrains allowed, third blocked');

        $owner = User::factory()->terrainOwner()->approved()->create();
        $this->subscribe($owner, 'gold');

        $this->actingAs($owner)
            ->postJson('/api/owner/terrains', $this->terrainPayload())
            ->assertCreated();
        $this->actingAs($owner)
            ->postJson('/api/owner/terrains', $this->terrainPayload())
            ->assertCreated();

        $this->actingAs($owner)
            ->postJson('/api/owner/terrains', $this->terrainPayload())
            ->assertStatus(403)
            ->assertJsonPath('error', 'PLAN_LIMIT_REACHED')
            ->assertJsonPath('current_usage', 2)
            ->assertJsonPath('limit', 2)
            ->assertJsonPath('required_plan', 'platinum');
    }

    public function test_platinum_owner_can_register_more_than_two_terrains(): void
    {
        $this->step('platinum: unlimited terrains');

        $owner = User::factory()->terrainOwner()->approved()->create();
        $this->subscribe($owner, 'platinum');

        for ($i = 0; $i < 3; $i++) {
            $this->actingAs($owner)
                ->postJson('/api/owner/terrains', $this->terrainPayload())
                ->assertCreated();
        }
    }

    public function test_downgrade_blocks_new_creation_but_keeps_existing_resources(): void
    {
        $this->step('downgrade: existing resources kept, new creation blocked');

        $owner = User::factory()->terrainOwner()->approved()->create();
        $this->subscribe($owner, 'gold');

        $this->actingAs($owner)
            ->postJson('/api/owner/terrains', $this->terrainPayload())
            ->assertCreated();
        $this->actingAs($owner)
            ->postJson('/api/owner/terrains', $this->terrainPayload())
            ->assertCreated();

        Subscription::query()->where('user_id', $owner->id)->update(['ends_at' => now()->subDay()]);

        $this->actingAs($owner)
            ->postJson('/api/owner/terrains', $this->terrainPayload())
            ->assertStatus(403)
            ->assertJsonPath('error', 'PLAN_LIMIT_REACHED');

        $this->assertSame(2, Stadium::where('owner_id', $owner->id)->count());
    }

    public function test_expired_subscription_restores_free_plan_limits(): void
    {
        $this->step('expired subscription falls back to bronze limits');

        [$manager] = $this->managerWithTeam('gold');
        Subscription::query()->where('user_id', $manager->id)->update(['ends_at' => now()->subDay()]);

        $this->actingAs($manager)
            ->postJson('/api/manager/match-requests', $this->matchRequestPayload(1))
            ->assertCreated();
        $this->actingAs($manager)
            ->postJson('/api/manager/match-requests', $this->matchRequestPayload(2))
            ->assertCreated();

        $this->actingAs($manager)
            ->postJson('/api/manager/match-requests', $this->matchRequestPayload(3))
            ->assertStatus(403)
            ->assertJsonPath('error', 'PLAN_LIMIT_REACHED')
            ->assertJsonPath('limit', 2);
    }

    public function test_tournament_limit_is_enforced_for_committee_users(): void
    {
        $this->step('bronze committee: tournaments require the gold plan');

        $bronze = User::factory()->committee()->approved()->create();
        $this->subscribe($bronze, 'bronze');

        $this->actingAs($bronze)
            ->postJson('/api/committee/tournaments', $this->tournamentPayload())
            ->assertStatus(403)
            ->assertJsonPath('error', 'PLAN_FEATURE_REQUIRED')
            ->assertJsonPath('limit', 0);
    }

    public function test_gold_committee_can_keep_one_active_tournament(): void
    {
        $this->step('gold committee: one active tournament, second blocked');

        $gold = User::factory()->committee()->approved()->create();
        $this->subscribe($gold, 'gold');

        $this->actingAs($gold)
            ->postJson('/api/committee/tournaments', $this->tournamentPayload())
            ->assertCreated();

        $this->actingAs($gold)
            ->postJson('/api/committee/tournaments', $this->tournamentPayload())
            ->assertStatus(403)
            ->assertJsonPath('error', 'PLAN_LIMIT_REACHED')
            ->assertJsonPath('current_usage', 1)
            ->assertJsonPath('limit', 1)
            ->assertJsonPath('required_plan', 'platinum');
    }

    public function test_platinum_committee_can_organize_multiple_tournaments(): void
    {
        $this->step('platinum committee: multiple tournaments allowed');

        $platinum = User::factory()->committee()->approved()->create();
        $this->subscribe($platinum, 'platinum');

        for ($i = 0; $i < 2; $i++) {
            $this->actingAs($platinum)
                ->postJson('/api/committee/tournaments', $this->tournamentPayload())
                ->assertCreated();
        }
    }

    public function test_advanced_statistics_requires_a_premium_plan(): void
    {
        $this->step('bronze blocked, gold allowed on advanced statistics');

        [$bronze] = $this->managerWithTeam('bronze');

        $this->actingAs($bronze)
            ->getJson('/api/v1/manager/team/statistics')
            ->assertStatus(403)
            ->assertJsonPath('error', 'PLAN_FEATURE_REQUIRED');

        [$gold] = $this->managerWithTeam('gold');

        $this->actingAs($gold)
            ->getJson('/api/v1/manager/team/statistics')
            ->assertOk();
    }

    public function test_landing_visibility_requires_a_premium_plan(): void
    {
        $this->step('bronze blocked, gold allowed on landing visibility');

        [$bronze] = $this->managerWithTeam('bronze');

        $this->actingAs($bronze)
            ->putJson('/api/v1/manager/team', ['visibility' => 'public'])
            ->assertStatus(403)
            ->assertJsonPath('error', 'PLAN_FEATURE_REQUIRED');

        $this->actingAs($bronze)
            ->putJson('/api/v1/manager/team', ['visibility' => 'private'])
            ->assertOk();

        [$gold] = $this->managerWithTeam('gold');

        $this->actingAs($gold)
            ->putJson('/api/v1/manager/team', ['visibility' => 'public'])
            ->assertOk();

        $this->assertSame('public', $gold->team->fresh()->visibility);
    }

    public function test_public_leaderboard_hides_private_teams(): void
    {
        $this->step('public leaderboard hides private teams');

        [$publicManager] = $this->managerWithTeam();
        Team::factory()->create([
            'manager_id' => $publicManager->id,
            'name' => 'الفريق العلني',
            'visibility' => 'public',
        ]);

        [$privateManager] = $this->managerWithTeam();
        Team::factory()->create([
            'manager_id' => $privateManager->id,
            'name' => 'الفريق الخاص',
            'visibility' => 'private',
        ]);

        $names = $this->getJson('/api/v1/leaderboard')
            ->assertOk()
            ->collect('data')
            ->pluck('name')
            ->all();

        $this->assertContains('الفريق العلني', $names);
        $this->assertNotContains('الفريق الخاص', $names);
    }
}
