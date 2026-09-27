<?php

namespace Tests\Feature\Committee;

use App\Domains\Booking\Events\BookingCancelled;
use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\StreamsProgress;
use Tests\TestCase;

class TournamentLeagueTest extends TestCase
{
    use RefreshDatabase;
    use StreamsProgress;

    private User $committee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->committee = User::factory()->committee()->approved()->create();
        Sanctum::actingAs($this->committee);
    }

    private function createLeagueTournament(array $overrides = []): Tournament
    {
        $payload = array_merge([
            'name' => 'دوري الأبطال ' . uniqid(),
            'category' => 'أكابر',
            'location' => 'الدار البيضاء',
            'start_date' => Carbon::now()->addDays(2)->toDateString(),
            'end_date' => Carbon::now()->addDays(30)->toDateString(),
            'tournament_format' => 'league',
            'league_mode' => 'single_round_robin',
            'rest_days_minimum' => 2,
            'teams_count' => 4,
            'groups_count' => 1,
            'teams_per_group' => 4,
            'points_for_win' => 3,
            'points_for_draw' => 1,
            'points_for_loss' => 0,
        ], $overrides);

        $response = $this->postJson('/api/committee/tournaments', $payload)->assertCreated();

        return Tournament::findOrFail($response->json('data.id'));
    }

    private function createStadium(): Stadium
    {
        return Stadium::factory()->create([
            'name' => 'مركب الوفاق',
            'supports_tournaments' => true,
            'is_open' => true,
            'is_available' => true,
        ]);
    }

    private function registerTeams(Tournament $tournament, int $count = 4): array
    {
        $teams = [];
        $teamIds = [];

        for ($i = 1; $i <= $count; $i++) {
            $team = Team::factory()->create(['name' => "فريق {$i} " . uniqid()]);
            $teams[] = $team;
            $teamIds[] = $team->id;
        }

        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams", [
            'team_ids' => $teamIds,
        ])->assertOk();

        return $teams;
    }

    public function test_committee_can_create_league_tournament(): void
    {
        $this->section('CREATE LEAGUE TOURNAMENT');
        $this->step('Posting league creation request');

        $tournament = $this->createLeagueTournament([
            'league_mode' => 'single_round_robin',
            'rest_days_minimum' => 3,
        ]);

        $this->note('Verifying league tournament fields in DB');
        $this->assertEquals('league', $tournament->tournament_format);
        $this->assertEquals('single_round_robin', $tournament->league_mode);
        $this->assertEquals(3, $tournament->rest_days_minimum);
    }

    public function test_league_fixture_generation_in_waiting_for_booking_status(): void
    {
        $this->section('LEAGUE FIXTURE GENERATION');
        $tournament = $this->createLeagueTournament(['teams_count' => 4]);

        $this->step('Registering 4 teams in the league');
        $teams = $this->registerTeams($tournament, 4);

        $this->step('Generating league round-robin fixtures');
        $response = $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", [
            'stage' => 'league',
        ])->assertCreated();

        // 4 teams single round robin = 4*3/2 = 6 fixtures across 3 matchdays
        $this->assertEquals(6, $response->json('data.generated'));

        $fixtures = Fixture::where('competition_id', $tournament->competition_id)->get();
        $this->assertCount(6, $fixtures);

        $this->note('Checking initial status is waiting_for_booking and unscheduled');
        foreach ($fixtures as $fixture) {
            $this->assertEquals(FixtureStatus::WaitingForBooking, $fixture->status);
            $this->assertNull($fixture->scheduled_at);
            $this->assertNull($fixture->stadium_id);
            $this->assertNull($fixture->match_id);
        }
    }

    public function test_league_suggestions_engine_detects_eligible_home_booking(): void
    {
        $this->section('LEAGUE SUGGESTIONS ENGINE');
        $tournament = $this->createLeagueTournament(['teams_count' => 4]);
        $teams = $this->registerTeams($tournament, 4);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", [
            'stage' => 'league',
        ])->assertCreated();

        $stadium = $this->createStadium();
        $homeTeam = $teams[0];
        $bookingDate = Carbon::now()->addDays(5)->toDateString();

        $this->step('Creating confirmed home booking for Team 1');
        $booking = TerrainBooking::create([
            'terrain_id' => $stadium->id,
            'manager_id' => $homeTeam->user_id ?? User::factory()->create()->id,
            'team_id' => $homeTeam->id,
            'booking_type' => 'match',
            'flow_type' => 'direct',
            'reservation_type' => 'single',
            'booking_date' => $bookingDate,
            'start_time' => '19:00',
            'end_time' => '21:00',
            'status' => 'confirmed',
        ]);

        $this->step('Calling suggestions endpoint');
        $response = $this->getJson("/api/committee/tournaments/{$tournament->id}/league/suggestions")
            ->assertOk();

        $suggestions = $response->json('data');
        $this->assertNotEmpty($suggestions);

        $matchSuggestion = collect($suggestions)->firstWhere('booking.id', $booking->id);
        $this->assertNotNull($matchSuggestion);
        $this->assertTrue($matchSuggestion['can_assign']);
        $this->assertEquals($homeTeam->id, $matchSuggestion['fixture']['home_team']['id']);
    }

    public function test_calendar_rest_rule_enforces_mandatory_rest_days(): void
    {
        $this->section('CALENDAR REST RULE ENFORCEMENT');
        $tournament = $this->createLeagueTournament([
            'teams_count' => 4,
            'rest_days_minimum' => 2, // Must have strictly > 2 days between matches
        ]);
        $teams = $this->registerTeams($tournament, 4);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", [
            'stage' => 'league',
        ])->assertCreated();

        $stadium = $this->createStadium();
        $team1 = $teams[0];
        $team2 = $teams[1];

        $fixtureA = Fixture::where('competition_id', $tournament->competition_id)
            ->where('home_team_id', $team1->id)
            ->first();

        // Team 1 plays Match A on Day 10
        $matchDateA = Carbon::now()->addDays(10)->setTime(20, 0);
        $fixtureA->update([
            'scheduled_at' => $matchDateA,
            'status' => FixtureStatus::Scheduled,
        ]);

        $this->step('Creating a booking for Team 1 only 1 day away (Day 11) - violating rest rule');
        $conflictBooking = TerrainBooking::create([
            'terrain_id' => $stadium->id,
            'manager_id' => $team1->user_id ?? User::factory()->create()->id,
            'team_id' => $team1->id,
            'booking_type' => 'match',
            'flow_type' => 'direct',
            'reservation_type' => 'single',
            'booking_date' => Carbon::now()->addDays(11)->toDateString(),
            'start_time' => '20:00',
            'end_time' => '22:00',
            'status' => 'confirmed',
        ]);

        $this->step('Calling suggestions endpoint to check rest rule enforcement');
        $response = $this->getJson("/api/committee/tournaments/{$tournament->id}/league/suggestions")
            ->assertOk();

        $suggestion = collect($response->json('data'))->firstWhere('booking.id', $conflictBooking->id);
        $this->assertNotNull($suggestion);
        $this->assertFalse($suggestion['can_assign']);
        $this->assertContains('rest_rule', collect($suggestion['validations'])->pluck('rule')->all());
    }

    public function test_committee_can_assign_booking_to_fixture(): void
    {
        $this->section('ASSIGN BOOKING TO FIXTURE');
        $tournament = $this->createLeagueTournament(['teams_count' => 4]);
        $teams = $this->registerTeams($tournament, 4);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", [
            'stage' => 'league',
        ])->assertCreated();

        $stadium = $this->createStadium();
        $homeTeam = $teams[0];
        $targetDate = Carbon::now()->addDays(7)->toDateString();

        $booking = TerrainBooking::create([
            'terrain_id' => $stadium->id,
            'manager_id' => $homeTeam->user_id ?? User::factory()->create()->id,
            'team_id' => $homeTeam->id,
            'booking_type' => 'match',
            'flow_type' => 'direct',
            'reservation_type' => 'single',
            'booking_date' => $targetDate,
            'start_time' => '18:00',
            'end_time' => '20:00',
            'status' => 'confirmed',
        ]);

        $fixture = Fixture::where('competition_id', $tournament->competition_id)
            ->where('home_team_id', $homeTeam->id)
            ->firstOrFail();

        $this->step('Assigning booking to fixture via API');
        $response = $this->postJson("/api/committee/tournaments/{$tournament->id}/league/assign", [
            'fixture_id' => $fixture->id,
            'booking_id' => $booking->id,
        ])->assertOk();

        $this->note('Checking updated fixture and newly created FootballMatch');
        $fixture->refresh();
        $booking->refresh();

        $this->assertEquals(FixtureStatus::Scheduled, $fixture->status);
        $this->assertEquals($stadium->id, $fixture->stadium_id);
        $this->assertNotNull($fixture->match_id);
        $this->assertEquals($fixture->id, $booking->fixture_id);

        $match = FootballMatch::find($fixture->match_id);
        $this->assertNotNull($match);
        $this->assertEquals($fixture->home_team_id, $match->home_team_id);
        $this->assertEquals($fixture->away_team_id, $match->away_team_id);
        $this->assertEquals($tournament->competition_id, $match->competition_id);
        $this->assertEquals($stadium->id, $match->stadium_id);
    }

    public function test_committee_can_unassign_fixture(): void
    {
        $this->section('UNASSIGN FIXTURE');
        $tournament = $this->createLeagueTournament(['teams_count' => 4]);
        $teams = $this->registerTeams($tournament, 4);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", [
            'stage' => 'league',
        ])->assertCreated();

        $stadium = $this->createStadium();
        $homeTeam = $teams[0];

        $booking = TerrainBooking::create([
            'terrain_id' => $stadium->id,
            'manager_id' => $homeTeam->user_id ?? User::factory()->create()->id,
            'team_id' => $homeTeam->id,
            'booking_type' => 'match',
            'flow_type' => 'direct',
            'reservation_type' => 'single',
            'booking_date' => Carbon::now()->addDays(8)->toDateString(),
            'start_time' => '17:00',
            'end_time' => '19:00',
            'status' => 'confirmed',
        ]);

        $fixture = Fixture::where('competition_id', $tournament->competition_id)
            ->where('home_team_id', $homeTeam->id)
            ->firstOrFail();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/league/assign", [
            'fixture_id' => $fixture->id,
            'booking_id' => $booking->id,
        ])->assertOk();

        $this->step('Unassigning the fixture');
        $this->postJson("/api/committee/tournaments/{$tournament->id}/league/unassign", [
            'fixture_id' => $fixture->id,
        ])->assertOk();

        $fixture->refresh();
        $booking->refresh();

        $this->note('Checking fixture reverted to waiting_for_booking');
        $this->assertEquals(FixtureStatus::WaitingForBooking, $fixture->status);
        $this->assertNull($fixture->scheduled_at);
        $this->assertNull($fixture->stadium_id);
        $this->assertNull($fixture->match_id);
        $this->assertNull($booking->fixture_id);

        $this->note('Verifying fixture was NOT deleted');
        $this->assertDatabaseHas('fixtures', ['id' => $fixture->id]);
    }

    public function test_booking_cancellation_triggers_rescheduling_required_without_fixture_deletion(): void
    {
        $this->section('BOOKING CANCELLATION FLOW');
        $tournament = $this->createLeagueTournament(['teams_count' => 4]);
        $teams = $this->registerTeams($tournament, 4);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", [
            'stage' => 'league',
        ])->assertCreated();

        $stadium = $this->createStadium();
        $homeTeam = $teams[0];

        $booking = TerrainBooking::create([
            'terrain_id' => $stadium->id,
            'manager_id' => $homeTeam->user_id ?? User::factory()->create()->id,
            'team_id' => $homeTeam->id,
            'booking_type' => 'match',
            'flow_type' => 'direct',
            'reservation_type' => 'single',
            'booking_date' => Carbon::now()->addDays(9)->toDateString(),
            'start_time' => '16:00',
            'end_time' => '18:00',
            'status' => 'confirmed',
        ]);

        $fixture = Fixture::where('competition_id', $tournament->competition_id)
            ->where('home_team_id', $homeTeam->id)
            ->firstOrFail();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/league/assign", [
            'fixture_id' => $fixture->id,
            'booking_id' => $booking->id,
        ])->assertOk();

        $fixture->refresh();
        $booking->refresh();
        $this->assertEquals(FixtureStatus::Scheduled, $fixture->status);

        $this->step('Dispatching BookingCancelled event for the assigned booking');
        event(new BookingCancelled($booking, null, 'الطرف ألغى الحجز لأسباب طارئة'));

        $fixture->refresh();

        $this->note('Fixture must transition to rescheduling_required and unscheduled');
        $this->assertEquals(FixtureStatus::ReschedulingRequired, $fixture->status);
        $this->assertNull($fixture->scheduled_at);
        $this->assertNull($fixture->stadium_id);
        $this->assertNull($fixture->match_id);

        $this->note('Fixture MUST still exist in database');
        $this->assertDatabaseHas('fixtures', ['id' => $fixture->id]);
    }

    public function test_committee_can_update_league_tournament_teams_count_without_group_knockout_errors(): void
    {
        $this->section('UPDATE LEAGUE TEAMS COUNT');
        $tournament = $this->createLeagueTournament(['teams_count' => 8]);

        $this->step('Updating tournament settings to 6 teams with null group/knockout fields');
        $response = $this->putJson("/api/committee/tournaments/{$tournament->id}", [
            'name' => $tournament->name,
            'tournament_format' => 'league',
            'league_mode' => 'single_round_robin',
            'rest_days_minimum' => 2,
            'teams_count' => 6,
            'teams_per_group' => null,
            'qualify_per_group' => null,
            'knockout_teams' => null,
            'groups_count' => null,
        ])->assertOk();

        $this->note('Verifying teams_count updated to 6');
        $tournament->refresh();
        $this->assertEquals(6, $tournament->teams_count);
        $this->assertEquals(6, $tournament->teams_per_group);
        $this->assertEquals(1, $tournament->groups_count);
    }
}
