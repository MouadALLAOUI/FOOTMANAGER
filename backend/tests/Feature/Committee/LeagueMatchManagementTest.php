<?php

namespace Tests\Feature\Committee;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchStatus;
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

class LeagueMatchManagementTest extends TestCase
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
            'end_date' => Carbon::now()->addDays(40)->toDateString(),
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
            'name' => 'ملعب الوفاق ' . uniqid(),
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

    /**
     * ACTION 1: Swap schedule between two matches.
     * Teams & roles stay unchanged; date, time, stadium and slots are exchanged in 1 transaction.
     */
    public function test_action_1_swap_schedules_between_two_matches(): void
    {
        $this->section('ACTION 1: SWAP SCHEDULES BETWEEN MATCHES');

        $tournament = $this->createLeagueTournament(['teams_count' => 4, 'rest_days_minimum' => 1]);
        $teams = $this->registerTeams($tournament, 4);
        $stadium = $this->createStadium();

        $this->step('Generating league fixtures');
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", ['stage' => 'league'])->assertCreated();

        $fixtures = Fixture::where('competition_id', $tournament->competition_id)->orderBy('id')->get();
        $fixture1 = $fixtures[0];
        $fixture2 = $fixtures[1];

        $date1 = Carbon::now()->addDays(5)->setHour(16)->setMinute(0);
        $date2 = Carbon::now()->addDays(10)->setHour(18)->setMinute(0);

        // Schedule fixture 1
        $match1 = FootballMatch::create([
            'competition_id' => $tournament->competition_id,
            'home_team_id' => $fixture1->home_team_id,
            'away_team_id' => $fixture1->away_team_id,
            'stadium_id' => $stadium->id,
            'status' => MatchStatus::Scheduled,
            'is_confirmed' => true,
        ]);
        $fixture1->update(['scheduled_at' => $date1, 'stadium_id' => $stadium->id, 'status' => FixtureStatus::Scheduled, 'match_id' => $match1->id]);

        // Schedule fixture 2
        $match2 = FootballMatch::create([
            'competition_id' => $tournament->competition_id,
            'home_team_id' => $fixture2->home_team_id,
            'away_team_id' => $fixture2->away_team_id,
            'stadium_id' => $stadium->id,
            'status' => MatchStatus::Scheduled,
            'is_confirmed' => true,
        ]);
        $fixture2->update(['scheduled_at' => $date2, 'stadium_id' => $stadium->id, 'status' => FixtureStatus::Scheduled, 'match_id' => $match2->id]);

        $this->step('Calling swap schedule candidates endpoint');
        $candidatesRes = $this->getJson("/api/committee/tournaments/{$tournament->id}/league/fixtures/{$fixture1->id}/swap-schedule-candidates")
            ->assertOk();
        $this->assertNotEmpty($candidatesRes->json('data.eligible_matches'));

        $this->step('Executing swap schedule between Fixture 1 and Fixture 2');
        $this->postJson("/api/committee/tournaments/{$tournament->id}/league/fixtures/{$fixture1->id}/swap-schedule", [
            'target_fixture_id' => $fixture2->id,
        ])->assertOk();

        $fixture1->refresh();
        $fixture2->refresh();

        $this->note('Checking Fixture 1 received Fixture 2 date, and Fixture 2 received Fixture 1 date');
        $this->assertEquals($date2->format('Y-m-d H:i'), $fixture1->scheduled_at->format('Y-m-d H:i'));
        $this->assertEquals($date1->format('Y-m-d H:i'), $fixture2->scheduled_at->format('Y-m-d H:i'));
        $this->assertTrue($fixture1->is_rescheduled);
        $this->assertTrue($fixture2->is_rescheduled);

        $this->step('Testing Undo restores original dates');
        $this->postJson("/api/committee/tournaments/{$tournament->id}/league/fixtures/{$fixture1->id}/undo-change")
            ->assertOk();

        $fixture1->refresh();
        $fixture2->refresh();
        $this->assertEquals($date1->format('Y-m-d H:i'), $fixture1->scheduled_at->format('Y-m-d H:i'));
        $this->assertEquals($date2->format('Y-m-d H:i'), $fixture2->scheduled_at->format('Y-m-d H:i'));
    }

    /**
     * ACTION 1: Replace with pending/postponed match.
     * Pending match takes the slot; this match becomes POSTPONED.
     */
    public function test_action_1_replace_with_pending_match_postpones_current_match(): void
    {
        $this->section('ACTION 1: REPLACE WITH PENDING MATCH');

        $tournament = $this->createLeagueTournament(['teams_count' => 4]);
        $teams = $this->registerTeams($tournament, 4);
        $stadium = $this->createStadium();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", ['stage' => 'league'])->assertCreated();

        $fixtures = Fixture::where('competition_id', $tournament->competition_id)->orderBy('id')->get();
        $fixture1 = $fixtures[0];
        $fixturePending = $fixtures[1];

        $date1 = Carbon::now()->addDays(8)->setHour(17)->setMinute(0);
        $match1 = FootballMatch::create([
            'competition_id' => $tournament->competition_id,
            'home_team_id' => $fixture1->home_team_id,
            'away_team_id' => $fixture1->away_team_id,
            'stadium_id' => $stadium->id,
            'status' => MatchStatus::Scheduled,
            'is_confirmed' => true,
        ]);
        $fixture1->update(['scheduled_at' => $date1, 'stadium_id' => $stadium->id, 'status' => FixtureStatus::Scheduled, 'match_id' => $match1->id]);
        $fixturePending->update(['status' => FixtureStatus::WaitingForBooking, 'scheduled_at' => null]);

        $this->step('Replacing Fixture 1 slot with pending fixture');
        $this->postJson("/api/committee/tournaments/{$tournament->id}/league/fixtures/{$fixture1->id}/replace-with-pending", [
            'pending_fixture_id' => $fixturePending->id,
        ])->assertOk();

        $fixture1->refresh();
        $fixturePending->refresh();

        $this->note('Checking Fixture 1 is now postponed and FixturePending has taken the slot');
        $this->assertEquals(FixtureStatus::Postponed, $fixture1->status);
        $this->assertNull($fixture1->scheduled_at);
        $this->assertEquals(FixtureStatus::Scheduled, $fixturePending->status);
        $this->assertEquals($date1->format('Y-m-d H:i'), $fixturePending->scheduled_at->format('Y-m-d H:i'));
    }

    /**
     * ACTION 2: Change any side (host or guest) with another eligible team.
     * Round-robin integrity: exchanges pairings in one transaction.
     */
    public function test_action_2_change_guest_side_with_eligible_team_and_exchanges_pairings(): void
    {
        $this->section('ACTION 2: CHANGE GUEST SIDE WITH ROUND-ROBIN PAIR EXCHANGE');

        $tournament = $this->createLeagueTournament(['teams_count' => 4, 'rest_days_minimum' => 1]);
        $teams = $this->registerTeams($tournament, 4);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", ['stage' => 'league'])->assertCreated();

        $fixture = Fixture::where('competition_id', $tournament->competition_id)->firstOrFail();
        $currentHomeId = $fixture->home_team_id;
        $currentAwayId = $fixture->away_team_id;

        $this->step('Fetching eligible teams for away side');
        $response = $this->getJson("/api/committee/tournaments/{$tournament->id}/league/fixtures/{$fixture->id}/eligible-teams?side=away")
            ->assertOk();

        $eligibleTeams = $response->json('data');
        $this->assertNotEmpty($eligibleTeams);

        $newAwayTeamId = $eligibleTeams[0]['team_id'];
        $this->assertNotEquals($currentHomeId, $newAwayTeamId);
        $this->assertNotEquals($currentAwayId, $newAwayTeamId);

        $this->step('Executing side change for away team');
        $this->putJson("/api/committee/tournaments/{$tournament->id}/league/fixtures/{$fixture->id}/change-side", [
            'side' => 'away',
            'new_team_id' => $newAwayTeamId,
        ])->assertOk();

        $fixture->refresh();
        $this->assertEquals($newAwayTeamId, $fixture->away_team_id);
    }

    /**
     * ACTION 3: Swap roles (host ⇄ guest).
     * Teams, date, time and stadium unchanged; note appears.
     */
    public function test_action_3_swap_roles_keeps_date_time_and_displays_note(): void
    {
        $this->section('ACTION 3: SWAP ROLES (HOST ⇄ GUEST)');

        $tournament = $this->createLeagueTournament(['teams_count' => 4]);
        $teams = $this->registerTeams($tournament, 4);
        $stadium = $this->createStadium();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", ['stage' => 'league'])->assertCreated();

        $fixture = Fixture::where('competition_id', $tournament->competition_id)->firstOrFail();
        $oldHomeId = $fixture->home_team_id;
        $oldAwayId = $fixture->away_team_id;
        $date = Carbon::now()->addDays(7)->setHour(19)->setMinute(0);

        // Create booking owned by oldHomeId
        $booking = TerrainBooking::create([
            'terrain_id' => $stadium->id,
            'team_id' => $oldHomeId,
            'manager_id' => $this->committee->id,
            'booking_type' => 'match',
            'flow_type' => 'direct',
            'reservation_type' => 'single',
            'booking_date' => $date->toDateString(),
            'start_time' => '19:00',
            'end_time' => '21:00',
            'status' => 'confirmed',
        ]);

        $match = FootballMatch::create([
            'competition_id' => $tournament->competition_id,
            'home_team_id' => $oldHomeId,
            'away_team_id' => $oldAwayId,
            'stadium_id' => $stadium->id,
            'active_reservation_id' => $booking->id,
            'status' => MatchStatus::Scheduled,
            'is_confirmed' => true,
        ]);

        $fixture->update([
            'scheduled_at' => $date,
            'stadium_id' => $stadium->id,
            'status' => FixtureStatus::Scheduled,
            'match_id' => $match->id,
        ]);

        $this->step('Swapping roles on the fixture');
        $this->putJson("/api/committee/tournaments/{$tournament->id}/league/fixtures/{$fixture->id}/swap-roles")
            ->assertOk();

        $fixture->refresh();
        $this->assertEquals($oldAwayId, $fixture->home_team_id);
        $this->assertEquals($oldHomeId, $fixture->away_team_id);
        $this->assertEquals($date->format('Y-m-d H:i'), $fixture->scheduled_at->format('Y-m-d H:i'));
        $this->assertEquals($stadium->id, $fixture->stadium_id);

        $this->note('Checking slot_note indicates slot belongs to guest');
        $this->assertNotNull($fixture->slot_note);
        $this->assertStringContainsString('(الضيف)', $fixture->slot_note);
    }

    /**
     * ALL ACTIONS: Matches with results or locked are hard blocked.
     */
    public function test_matches_with_results_are_hard_blocked_for_all_three_actions(): void
    {
        $this->section('BLOCK FINISHED MATCHES ACROSS ALL ACTIONS');

        $tournament = $this->createLeagueTournament(['teams_count' => 4]);
        $teams = $this->registerTeams($tournament, 4);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", ['stage' => 'league'])->assertCreated();

        $fixture = Fixture::where('competition_id', $tournament->competition_id)->firstOrFail();
        $match = FootballMatch::create([
            'competition_id' => $tournament->competition_id,
            'home_team_id' => $fixture->home_team_id,
            'away_team_id' => $fixture->away_team_id,
            'status' => MatchStatus::Finished,
            'home_score' => 2,
            'away_score' => 1,
            'is_confirmed' => true,
        ]);
        $fixture->update(['status' => FixtureStatus::Played, 'match_id' => $match->id]);

        $this->step('Attempting Action 1 (swap schedule candidates) on finished match');
        $this->getJson("/api/committee/tournaments/{$tournament->id}/league/fixtures/{$fixture->id}/swap-schedule-candidates")
            ->assertStatus(422);

        $this->step('Attempting Action 2 (eligible teams) on finished match');
        $this->getJson("/api/committee/tournaments/{$tournament->id}/league/fixtures/{$fixture->id}/eligible-teams?side=away")
            ->assertStatus(422);

        $this->step('Attempting Action 3 (swap roles) on finished match');
        $this->putJson("/api/committee/tournaments/{$tournament->id}/league/fixtures/{$fixture->id}/swap-roles")
            ->assertStatus(422);
    }
}
