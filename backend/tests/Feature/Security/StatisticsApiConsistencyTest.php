<?php

namespace Tests\Feature\Security;

use App\Domains\Stadium\Models\Stadium;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\StreamsProgress;
use Tests\TestCase;

class StatisticsApiConsistencyTest extends TestCase
{
    use RefreshDatabase, StreamsProgress;

    protected function setUp(): void
    {
        parent::setUp();
        $this->section('setting up test data for statistics consistency');

        $this->admin = User::factory()->approved()->create(['role' => 'admin']);
        $this->manager = User::factory()->approved()->create([
            'name' => 'Stats Manager',
            'email' => 'stats-manager@test.com',
            'phone' => '0610000001',
        ]);
        $this->player = User::factory()->approved()->create([
            'role' => 'player',
            'name' => 'Stats Player',
            'email' => 'stats-player@test.com',
        ]);
        $this->terrainOwner = User::factory()->approved()->terrainOwner()->create([
            'name' => 'Stats Owner',
            'email' => 'stats-owner@test.com',
        ]);
    }

    // ───────────────────────────────────────────
    // A. Public stats response shape
    // ───────────────────────────────────────────

    public function test_public_stats_returns_flat_keys_without_data_wrapper(): void
    {
        $this->section('GET /v1/stats returns flat response (no data wrapper)');

        $res = $this->getJson('/api/v1/stats');
        $res->assertOk();

        $json = $res->json();
        $this->assertArrayHasKey('teams', $json, 'response must contain "teams" at top level');
        $this->assertArrayHasKey('players', $json, 'response must contain "players" at top level');
        $this->assertArrayHasKey('stadiums', $json, 'response must contain "stadiums" at top level');
        $this->assertArrayHasKey('matches', $json, 'response must contain "matches" at top level');
        $this->assertArrayHasKey('upcoming_matches', $json, 'response must contain "upcoming_matches"');
        $this->assertArrayHasKey('live_matches', $json, 'response must contain "live_matches"');
        $this->assertArrayHasKey('bookings', $json, 'response must contain "bookings"');
        $this->assertArrayHasKey('updated_at', $json, 'response must contain "updated_at"');

        $this->assertArrayNotHasKey('data', $json, 'must NOT wrap stats inside a "data" key');
    }

    public function test_public_stats_returns_zero_values_on_empty_database(): void
    {
        $this->section('empty DB still returns valid stats with zero counts');

        $res = $this->getJson('/api/v1/stats');
        $res->assertOk();

        $json = $res->json();
        $this->assertIsInt($json['teams']);
        $this->assertIsInt($json['players']);
        $this->assertIsInt($json['stadiums']);
        $this->assertIsInt($json['matches']);
        $this->assertIsInt($json['bookings']);
        $this->assertEquals(0, $json['teams']);
        $this->assertEquals(0, $json['players']);
    }

    public function test_public_stats_is_accessible_without_authentication(): void
    {
        $this->section('stats endpoint is public, no auth required');

        $res = $this->getJson('/api/v1/stats');
        $res->assertOk();
    }

    // ───────────────────────────────────────────
    // B. Leaderboard response shape
    // ───────────────────────────────────────────

    public function test_leaderboard_returns_data_array_with_meta(): void
    {
        $this->section('GET /v1/leaderboard returns { data: [...], meta: {...} }');

        $res = $this->getJson('/api/v1/leaderboard');
        $res->assertOk();

        $json = $res->json();
        $this->assertArrayHasKey('data', $json, 'response must contain "data" array');
        $this->assertArrayHasKey('meta', $json, 'response must contain "meta" object');
        $this->assertIsArray($json['data']);
        $this->assertArrayHasKey('total', $json['meta']);
    }

    public function test_leaderboard_data_entries_contain_required_fields(): void
    {
        $this->section('leaderboard entries have consistent field names');

        $res = $this->getJson('/api/v1/leaderboard');
        $res->assertOk();

        $entries = $res->json('data');
        if (count($entries) > 0) {
            $entry = $entries[0];
            $this->assertArrayHasKey('id', $entry);
            $this->assertArrayHasKey('name', $entry);
            $this->assertArrayHasKey('points', $entry);
            $this->assertArrayHasKey('matches_played', $entry);
            $this->assertArrayHasKey('wins', $entry);
            $this->assertArrayHasKey('goals_for', $entry);
            $this->assertArrayHasKey('rank', $entry);
        }
    }

    // ───────────────────────────────────────────
    // C. Admin stats — role-gated
    // ───────────────────────────────────────────

    public function test_admin_stats_requires_admin_role(): void
    {
        $this->section('GET /admin/stats returns 403 for non-admin users');

        Sanctum::actingAs($this->manager);
        $res = $this->getJson('/api/admin/stats');
        $res->assertForbidden();
    }

    public function test_admin_stats_returns_stats_wrapper_for_admin(): void
    {
        $this->section('GET /admin/stats returns { stats: {...} } for admin');

        Sanctum::actingAs($this->admin);
        $res = $this->getJson('/api/admin/stats');
        $res->assertOk();

        $json = $res->json();
        $this->assertArrayHasKey('stats', $json, 'admin stats must wrap in "stats" key');
        $this->assertArrayHasKey('total', $json['stats']);
        $this->assertArrayHasKey('pending', $json['stats']);
        $this->assertArrayHasKey('approved', $json['stats']);
        $this->assertArrayHasKey('rejected', $json['stats']);
        $this->assertArrayHasKey('blocked', $json['stats']);
        $this->assertArrayHasKey('players_total', $json['stats']);
        $this->assertArrayHasKey('terrain_owners_total', $json['stats']);
    }

    public function test_admin_stats_returns_valid_values_on_empty_database(): void
    {
        $this->section('admin stats with no data still returns valid integers');

        Sanctum::actingAs($this->admin);
        $res = $this->getJson('/api/admin/stats');
        $res->assertOk();

        $stats = $res->json('stats');
        $this->assertEquals(0, $stats['total']);
        $this->assertEquals(0, $stats['pending']);
        $this->assertEquals(0, $stats['players_total']);
    }

    // ───────────────────────────────────────────
    // D. Player stats — role-gated
    // ───────────────────────────────────────────

    public function test_player_stats_requires_player_role(): void
    {
        $this->section('GET /player/stats returns 403 for non-players');

        Sanctum::actingAs($this->manager);
        $res = $this->getJson('/api/player/stats');
        $res->assertForbidden();
    }

    public function test_player_stats_returns_stats_wrapper_for_player(): void
    {
        $this->section('GET /player/stats returns { stats: {...} } for player');

        Sanctum::actingAs($this->player);
        $res = $this->getJson('/api/player/stats');
        $res->assertOk();

        $json = $res->json();
        $this->assertArrayHasKey('stats', $json, 'player stats must wrap in "stats" key');
        $this->assertArrayHasKey('points', $json['stats']);
        $this->assertArrayHasKey('rating', $json['stats']);
        $this->assertArrayHasKey('matches_played', $json['stats']);
        $this->assertArrayHasKey('wins', $json['stats']);
        $this->assertArrayHasKey('win_rate', $json['stats']);
    }

    public function test_player_stats_returns_zero_values_for_new_player(): void
    {
        $this->section('new player stats return zero/default values');

        Sanctum::actingAs($this->player);
        $res = $this->getJson('/api/player/stats');
        $res->assertOk();

        $stats = $res->json('stats');
        $this->assertEquals(0, $stats['points']);
        $this->assertEquals(0, $stats['matches_played']);
        $this->assertEquals(0, $stats['win_rate']);
    }

    // ───────────────────────────────────────────
    // E. Player overview — role-gated, composite
    // ───────────────────────────────────────────

    public function test_player_overview_requires_player_role(): void
    {
        $this->section('GET /player/overview returns 403 for non-players');

        Sanctum::actingAs($this->manager);
        $res = $this->getJson('/api/player/overview');
        $res->assertForbidden();
    }

    public function test_player_overview_returns_composite_shape(): void
    {
        $this->section('player overview returns expected composite keys');

        Sanctum::actingAs($this->player);
        $res = $this->getJson('/api/player/overview');
        $res->assertOk();

        $json = $res->json();
        $this->assertArrayHasKey('user', $json);
        $this->assertArrayHasKey('profile', $json);
        $this->assertArrayHasKey('stats', $json);
        $this->assertArrayHasKey('team', $json);
        $this->assertArrayHasKey('feed', $json);
        $this->assertArrayHasKey('notifications', $json);
    }

    // ───────────────────────────────────────────
    // F. Owner stats — role-gated
    // ───────────────────────────────────────────

    public function test_owner_stats_requires_terrain_owner_role(): void
    {
        $this->section('GET /owner/stats returns 403 for non-terrain-owners');

        Sanctum::actingAs($this->manager);
        $res = $this->getJson('/api/owner/stats');
        $res->assertForbidden();
    }

    public function test_owner_stats_returns_stats_wrapper_for_terrain_owner(): void
    {
        $this->section('GET /owner/stats returns { stats: {...} } for terrain owner');

        Sanctum::actingAs($this->terrainOwner);
        $res = $this->getJson('/api/owner/stats');
        $res->assertOk();

        $json = $res->json();
        $this->assertArrayHasKey('stats', $json, 'owner stats must wrap in "stats" key');
        $this->assertArrayHasKey('total_terrains', $json['stats']);
        $this->assertArrayHasKey('available_terrains', $json['stats']);
        $this->assertArrayHasKey('booked_matches', $json['stats']);
        $this->assertArrayHasKey('pending_matches', $json['stats']);
        $this->assertArrayHasKey('total_revenue', $json['stats']);
    }

    public function test_owner_stats_returns_zero_values_for_new_owner(): void
    {
        $this->section('new terrain owner stats return zero/default values');

        Sanctum::actingAs($this->terrainOwner);
        $res = $this->getJson('/api/owner/stats');
        $res->assertOk();

        $stats = $res->json('stats');
        $this->assertEquals(0, $stats['total_terrains']);
        $this->assertEquals(0, $stats['available_terrains']);
        $this->assertEquals(0, $stats['booked_matches']);
    }

    // ───────────────────────────────────────────
    // G. Cross-role: players cannot access admin/owner stats
    // ───────────────────────────────────────────

    public function test_player_cannot_access_admin_stats(): void
    {
        $this->section('player role cannot access admin stats endpoint');

        Sanctum::actingAs($this->player);
        $res = $this->getJson('/api/admin/stats');
        $res->assertForbidden();
    }

    public function test_player_cannot_access_owner_stats(): void
    {
        $this->section('player role cannot access owner stats endpoint');

        Sanctum::actingAs($this->player);
        $res = $this->getJson('/api/owner/stats');
        $res->assertForbidden();
    }

    public function test_admin_cannot_access_player_stats(): void
    {
        $this->section('admin role cannot access player stats endpoint');

        Sanctum::actingAs($this->admin);
        $res = $this->getJson('/api/player/stats');
        $res->assertForbidden();
    }

    public function test_terrain_owner_cannot_access_player_stats(): void
    {
        $this->section('terrain owner cannot access player stats endpoint');

        Sanctum::actingAs($this->terrainOwner);
        $res = $this->getJson('/api/player/stats');
        $res->assertForbidden();
    }

    public function test_unauthenticated_access_returns_401_for_protected_stats(): void
    {
        $this->section('unauthenticated requests get 401 for protected stats endpoints');

        $res = $this->getJson('/api/admin/stats');
        $res->assertUnauthorized();

        $res = $this->getJson('/api/player/stats');
        $res->assertUnauthorized();

        $res = $this->getJson('/api/owner/stats');
        $res->assertUnauthorized();
    }

    // ───────────────────────────────────────────
    // H. Nonexistent routes return 404
    // ───────────────────────────────────────────

    public function test_invalid_stats_route_returns_404(): void
    {
        $this->section('nonexistent stats endpoints return 404');

        $res = $this->getJson('/api/v1/nonexistent-stats');
        $res->assertNotFound();
    }
}
