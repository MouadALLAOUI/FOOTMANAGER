<?php

namespace Tests\Feature\Legacy;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Match\Models\MatchRequest;
use App\Domains\Player\Models\Player;
use App\Domains\Stadium\Models\Facility;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Phase 0 regression coverage for the legacy (non-/v1) endpoints:
 * auth, manager roster, booking-conflict messages, leaderboard + cache
 * invalidation, and the remaining public read endpoints.
 */
class LegacyApiTest extends TestCase
{
    use RefreshDatabase;

    private function approvedManagerWithTeam(): array
    {
        $manager = User::factory()->approved()->create();
        $team = Team::factory()->create(['manager_id' => $manager->id]);

        return [$manager, $team];
    }

    public function test_register_creates_pending_manager_and_team(): void
    {
        Mail::fake();

        $payload = [
            'name' => 'مدير جديد',
            'phone' => '0661112233',
            'password' => 'secret1234',
            'team_name' => 'اتحاد المحبة',
            'member_count' => 15,
            'team_category' => 'adult',
        ];

        $this->postJson('/api/register', $payload)
            ->assertCreated()
            ->assertJsonPath('user.status', 'pending')
            ->assertJsonPath('user.role', 'manager');

        $this->assertDatabaseHas('teams', ['name' => 'اتحاد المحبة']);
    }

    public function test_login_returns_token_for_approved_user(): void
    {
        $user = User::factory()->approved()->create();

        $this->postJson('/api/login', [
            'login' => $user->phone,
            'password' => 'password',
        ])->assertOk()
            ->assertJsonStructure(['token', 'user']);

        $this->postJson('/api/login', [
            'login' => $user->phone,
            'password' => 'wrong-password',
        ])->assertUnauthorized();
    }

    public function test_pending_user_cannot_login(): void
    {
        $user = User::factory()->pending()->create();

        $this->postJson('/api/login', [
            'login' => $user->phone,
            'password' => 'password',
        ])->assertForbidden();
    }

    public function test_me_returns_own_profile(): void
    {
        $manager = User::factory()->approved()->create();

        Sanctum::actingAs($manager);

        $this->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user.id', $manager->id)
            ->assertJsonStructure(['user' => ['id', 'name', 'phone', 'role', 'status']]);
    }

    public function test_manager_roster_crud(): void
    {
        [$manager, $team] = $this->approvedManagerWithTeam();
        Sanctum::actingAs($manager);

        $this->postJson('/api/manager/players', [
            'name' => 'كريم العربي',
            'position' => 'forward',
            'number' => 9,
        ])->assertCreated()
            ->assertJsonPath('player.team_id', $team->id);

        $this->assertDatabaseHas('players', ['team_id' => $team->id, 'name' => 'كريم العربي']);

        $player = Player::where('team_id', $team->id)->firstOrFail();

        $this->getJson('/api/manager/players')
            ->assertOk()
            ->assertJsonCount(1, 'players');

        $this->putJson("/api/manager/players/{$player->id}", [
            'name' => 'كريم العربي المعدل',
            'number' => 10,
        ])->assertOk()
            ->assertJsonPath('player.name', 'كريم العربي المعدل')
            ->assertJsonPath('player.number', 10);

        $this->deleteJson("/api/manager/players/{$player->id}")
            ->assertOk();

        $this->assertDatabaseMissing('players', ['id' => $player->id]);
    }

    public function test_manager_cannot_edit_another_teams_player(): void
    {
        [$manager] = $this->approvedManagerWithTeam();
        [$otherManager] = $this->approvedManagerWithTeam();

        $player = Player::factory()->create();

        Sanctum::actingAs($manager);

        $this->putJson("/api/manager/players/{$player->id}", [
            'name' => 'محاولة تعديل',
        ])->assertNotFound();

        $this->deleteJson("/api/manager/players/{$player->id}")
            ->assertNotFound();
    }

    public function test_single_booking_conflict_returns_clean_arabic_message(): void
    {
        [$manager, $team] = $this->approvedManagerWithTeam();
        $terrain = Stadium::factory()->create();
        $date = now()->addDay()->toDateString();

        TerrainBooking::create([
            'terrain_id' => $terrain->id,
            'manager_id' => $manager->id,
            'team_id' => $team->id,
            'booking_type' => 'training',
            'flow_type' => 'direct',
            'reservation_type' => 'single',
            'booking_date' => $date,
            'start_time' => '10:00',
            'end_time' => '11:00',
            'price' => 200,
            'status' => 'pending',
        ]);

        Sanctum::actingAs($manager);

        $this->postJson('/api/manager/bookings/training', [
            'terrain_id' => $terrain->id,
            'reservation_type' => 'single',
            'booking_date' => $date,
            'start_time' => '10:30',
            'end_time' => '11:30',
            'booking_type' => 'training',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'هذا الوقت محجوز بالفعل في التاريخ المحدد.');
    }

    public function test_weekly_subscription_conflict_returns_clean_arabic_message(): void
    {
        [$manager, $team] = $this->approvedManagerWithTeam();
        $terrain = Stadium::factory()->create();
        $startDate = now()->addDay()->toDateString();

        TerrainBooking::create([
            'terrain_id' => $terrain->id,
            'manager_id' => $manager->id,
            'team_id' => $team->id,
            'booking_type' => 'training',
            'flow_type' => 'direct',
            'reservation_type' => 'weekly_subscription',
            'booking_date' => $startDate,
            'start_date' => $startDate,
            'end_date' => now()->addDays(30)->toDateString(),
            'day_of_week' => (int) now()->addDay()->dayOfWeek,
            'start_time' => '18:00',
            'end_time' => '19:00',
            'price' => 800,
            'status' => 'approved',
        ]);

        Sanctum::actingAs($manager);

        $this->postJson('/api/manager/bookings/training', [
            'terrain_id' => $terrain->id,
            'reservation_type' => 'weekly_subscription',
            'start_date' => $startDate,
            'end_date' => now()->addDays(30)->toDateString(),
            'day_of_week' => (int) now()->addDay()->dayOfWeek,
            'start_time' => '18:30',
            'end_time' => '19:30',
            'booking_type' => 'training',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'هذا التوقيت محجوز مسبقاً عبر أبونمان أسبوعي.');
    }

    public function test_leaderboard_shape_and_pending_team_exclusion(): void
    {
        [$approvedManager, $approvedTeam] = $this->approvedManagerWithTeam();
        $pendingManager = User::factory()->pending()->create();
        Team::factory()->create(['manager_id' => $pendingManager->id]);

        $this->getJson('/api/leaderboard')
            ->assertOk()
            ->assertJsonStructure(['teams', 'current_page', 'last_page', 'per_page', 'total'])
            ->assertJsonPath('total', 1)
            ->assertJsonPath('teams.0.id', $approvedTeam->id);
    }

    public function test_leaderboard_flushed_after_score_confirmation(): void
    {
        [$hostManager, $hostTeam] = $this->approvedManagerWithTeam();
        [$opponentManager, $opponentTeam] = $this->approvedManagerWithTeam();

        $stadium = Stadium::factory()->create();

        $match = MatchRequest::create([
            'host_team_id' => $hostTeam->id,
            'opponent_team_id' => $opponentTeam->id,
            'stadium_id' => $stadium->id,
            'match_datetime' => now()->subHours(2),
            'status' => 'accepted',
            'score_status' => 'pending_confirmation',
            'score_submitted_by' => $opponentManager->id,
            'host_score' => 2,
            'opponent_score' => 1,
        ]);

        // Warm the (pre-confirmation) leaderboard cache.
        $this->getJson('/api/leaderboard')
            ->assertOk()
            ->assertJsonPath('total', 2);

        Sanctum::actingAs($hostManager);

        $this->postJson("/api/manager/matches/{$match->id}/confirm-score")
            ->assertOk();

        $this->getJson('/api/leaderboard')
            ->assertOk()
            ->assertJsonPath('teams.0.id', $hostTeam->id)
            ->assertJsonPath('teams.0.points', 3);
    }

    public function test_public_read_endpoints_return_expected_shape(): void
    {
        $owner = User::factory()->approved()->create(['role' => 'terrain_owner']);
        $terrain = Stadium::factory()->create(['owner_id' => $owner->id]);
        $facility = Facility::create(['name' => 'ملعب عشبي', 'icon' => '🏟']);

        $this->getJson('/api/stadiums')
            ->assertOk()
            ->assertJsonStructure(['stadiums'])
            ->assertJsonCount(1, 'stadiums');

        $this->getJson('/api/terrains/public')
            ->assertOk()
            ->assertJsonStructure(['terrains'])
            ->assertJsonCount(1, 'terrains');

        $this->getJson('/api/facilities')
            ->assertOk()
            ->assertJsonStructure(['facilities'])
            ->assertJsonPath('facilities.0.id', $facility->id);

        $this->getJson('/api/settings/public')
            ->assertOk()
            ->assertJsonStructure(['settings']);
    }

    public function test_terrain_not_listed_when_owner_pending_but_closed_terrain_still_visible(): void
    {
        $pendingOwner = User::factory()->pending()->create(['role' => 'terrain_owner']);
        Stadium::factory()->create(['owner_id' => $pendingOwner->id]);

        $approvedOwner = User::factory()->approved()->create(['role' => 'terrain_owner']);
        $closedTerrain = Stadium::factory()->create(['owner_id' => $approvedOwner->id, 'is_open' => false]);

        $this->getJson('/api/terrains/public')
            ->assertOk()
            ->assertJsonCount(1, 'terrains')
            ->assertJsonPath('terrains.0.id', $closedTerrain->id);
    }
}
