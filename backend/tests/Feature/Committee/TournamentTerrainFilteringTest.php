<?php

namespace Tests\Feature\Committee;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Competition\Models\Competition;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TournamentTerrainFilteringTest extends TestCase
{
    use RefreshDatabase;

    private User $committee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->committee = User::factory()->committee()->approved()->create();
        Sanctum::actingAs($this->committee);
    }

    private function createTournament(): Tournament
    {
        $response = $this->postJson('/api/committee/tournaments', [
            'name' => 'بطولة الأقاليم '.uniqid(),
            'edition' => '1',
            'category' => 'أكابر',
            'location' => 'الرباط',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-20',
            'tournament_format' => 'groups_knockout',
            'teams_count' => 8,
            'groups_count' => 2,
            'teams_per_group' => 4,
            'knockout_teams' => 4,
            'points_for_win' => 3,
            'points_for_draw' => 1,
            'points_for_loss' => 0,
        ])->assertCreated();

        return Tournament::findOrFail($response->json('data.id'));
    }

    private function makeTeams(Tournament $tournament, int $count = 8): void
    {
        $teamIds = [];

        for ($i = 0; $i < $count; $i++) {
            $teamIds[] = Team::factory()->create()->id;
        }

        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams", ['team_ids' => $teamIds])->assertOk();
        $this->postJson("/api/committee/tournaments/{$tournament->id}/draw")->assertOk();

        $tournament->refresh();
    }

    private function tournamentCapableStadium(array $overrides = []): Stadium
    {
        return Stadium::factory()->create(array_merge([
            'supports_tournaments' => true,
            'is_open' => true,
            'is_available' => true,
        ], $overrides));
    }

    private function getTerrains(Tournament $tournament, string $date = '2026-09-01', string $time = '20:00')
    {
        return $this->getJson("/api/committee/tournaments/{$tournament->id}/fixtures/terrains?date={$date}&time={$time}")->assertOk();
    }

    public function test_endpoint_returns_only_tournament_capable_terrains(): void
    {
        $tournament = $this->createTournament();

        $supported = $this->tournamentCapableStadium();
        $unsupported = Stadium::factory()->create(['supports_tournaments' => false]);

        $response = $this->getTerrains($tournament);

        $this->assertCount(1, $response->json('data.terrains'));
        $this->assertEquals($supported->id, $response->json('data.terrains.0.id'));
        $this->assertEquals(1, $response->json('data.total'));
        $this->assertEquals(1, $response->json('data.available'));
    }

    public function test_closed_and_unavailable_terrains_are_excluded(): void
    {
        $tournament = $this->createTournament();

        $this->tournamentCapableStadium(['is_open' => false]);
        $this->tournamentCapableStadium(['is_available' => false]);
        $available = $this->tournamentCapableStadium();

        $response = $this->getTerrains($tournament);

        $this->assertCount(1, $response->json('data.terrains'));
        $this->assertEquals($available->id, $response->json('data.terrains.0.id'));
    }

    public function test_booking_conflict_marks_terrain_unavailable_with_authoritative_reason(): void
    {
        $tournament = $this->createTournament();

        $busy = $this->tournamentCapableStadium();
        $free = $this->tournamentCapableStadium();

        TerrainBooking::create([
            'terrain_id' => $busy->id,
            'manager_id' => User::factory()->create()->id,
            'team_id' => Team::factory()->create()->id,
            'booking_type' => 'match',
            'flow_type' => 'direct',
            'reservation_type' => 'single',
            'booking_date' => '2026-09-01',
            'start_time' => '20:00',
            'end_time' => '22:00',
            'status' => 'confirmed',
        ]);

        $response = $this->getTerrains($tournament);

        $busyTerrain = collect($response->json('data.terrains'))->firstWhere('id', $busy->id);
        $freeTerrain = collect($response->json('data.terrains'))->firstWhere('id', $free->id);

        $this->assertFalse($busyTerrain['slot_available']);
        $this->assertNotNull($busyTerrain['unavailable_reason']);
        $this->assertTrue($freeTerrain['slot_available']);
        $this->assertNull($freeTerrain['unavailable_reason']);
    }

    public function test_existing_tournament_fixture_conflict_is_detected(): void
    {
        $tournament = $this->createTournament();

        $clashing = $this->tournamentCapableStadium();
        $clear = $this->tournamentCapableStadium();

        $home = Team::factory()->create();
        $away = Team::factory()->create();
        $competition = Competition::create(['name' => 'مسابقة '.uniqid()]);

        $match = FootballMatch::create([
            'competition_id' => $competition->id,
            'home_team_id' => $home->id,
            'away_team_id' => $away->id,
            'stadium_id' => $clashing->id,
            'status' => 'scheduled',
            'created_by' => $this->committee->id,
        ]);

        Fixture::create([
            'competition_id' => $competition->id,
            'match_id' => $match->id,
            'stadium_id' => $clashing->id,
            'home_team_id' => $home->id,
            'away_team_id' => $away->id,
            'scheduled_at' => '2026-09-01 21:00:00',
            'status' => 'scheduled',
        ]);

        $response = $this->getTerrains($tournament);

        $clashingTerrain = collect($response->json('data.terrains'))->firstWhere('id', $clashing->id);
        $clearTerrain = collect($response->json('data.terrains'))->firstWhere('id', $clear->id);

        $this->assertFalse($clashingTerrain['slot_available']);
        $this->assertEquals('هذا التوقيت محجوز لمباراة بطولة أخرى', $clashingTerrain['unavailable_reason']);
        $this->assertTrue($clearTerrain['slot_available']);
    }

    public function test_terrain_response_includes_display_fields(): void
    {
        $tournament = $this->createTournament();
        $stadium = $this->tournamentCapableStadium(['type' => 'synthetic', 'city' => 'الرباط', 'price_per_hour' => 500]);

        $response = $this->getTerrains($tournament)->assertJsonPath('data.terrains.0.name', $stadium->name);

        $terrain = $response->json('data.terrains.0');

        $this->assertEquals('synthetic', $terrain['type']);
        $this->assertEquals('الرباط', $terrain['city']);
        $this->assertEquals(500.0, $terrain['price_per_hour']);
        $this->assertTrue($terrain['supports_tournaments']);
        $this->assertArrayHasKey('cover_image_url', $terrain);
    }

    public function test_reschedule_rejects_unsupported_terrain(): void
    {
        $tournament = $this->createTournament();
        $this->makeTeams($tournament);

        [$home, $away] = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->limit(2)
            ->pluck('team_id');

        $unsupported = Stadium::factory()->create(['supports_tournaments' => false]);

        $fixture = $this->fixtureFor($tournament, $home, $away, $unsupported);

        $this->putJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}", [
            'scheduled_at' => '2026-09-02 18:00:00',
            'stadium_id' => $unsupported->id,
        ])->assertUnprocessable()
            ->assertJsonFragment(['message' => "ملعب «{$unsupported->name}» لا يدعم البطولات"]);
    }

    public function test_reschedule_rejects_closed_terrain(): void
    {
        $tournament = $this->createTournament();
        $this->makeTeams($tournament);

        [$home, $away] = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->limit(2)
            ->pluck('team_id');

        $closed = $this->tournamentCapableStadium(['is_open' => false]);

        $fixture = $this->fixtureFor($tournament, $home, $away, $closed);

        $this->putJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}", [
            'scheduled_at' => '2026-09-02 18:00:00',
            'stadium_id' => $closed->id,
        ])->assertUnprocessable()
            ->assertJsonFragment(['message' => "ملعب «{$closed->name}» مغلق حالياً"]);
    }

    public function test_reschedule_rejects_conflicting_booking_slot(): void
    {
        $tournament = $this->createTournament();
        $this->makeTeams($tournament);

        [$home, $away] = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->limit(2)
            ->pluck('team_id');

        $stadium = $this->tournamentCapableStadium();

        TerrainBooking::create([
            'terrain_id' => $stadium->id,
            'manager_id' => User::factory()->create()->id,
            'team_id' => Team::factory()->create()->id,
            'booking_type' => 'match',
            'flow_type' => 'direct',
            'reservation_type' => 'single',
            'booking_date' => '2026-09-02',
            'start_time' => '18:00',
            'end_time' => '20:00',
            'status' => 'confirmed',
        ]);

        // The fixture sits on the same terrain but at a different slot.
        $fixture = $this->fixtureFor($tournament, $home, $away, $stadium, '2026-09-05 20:00:00');

        $this->putJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}", [
            'scheduled_at' => '2026-09-02 18:00:00',
            'stadium_id' => $stadium->id,
        ])->assertUnprocessable()
            ->assertJsonFragment(['message' => 'هذا التوقيت محجوز في الملعب المحدد']);
    }

    public function test_reschedule_rejects_conflicting_tournament_fixture(): void
    {
        $tournament = $this->createTournament();
        $this->makeTeams($tournament);

        [$home, $away, $other] = TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->limit(3)
            ->pluck('team_id');

        $stadium = $this->tournamentCapableStadium();

        $competition = Competition::create(['name' => 'مسابقة '.uniqid()]);

        $otherMatch = FootballMatch::create([
            'competition_id' => $competition->id,
            'home_team_id' => $other,
            'away_team_id' => $home,
            'stadium_id' => $stadium->id,
            'status' => 'scheduled',
            'created_by' => $this->committee->id,
        ]);

        Fixture::create([
            'competition_id' => $competition->id,
            'match_id' => $otherMatch->id,
            'stadium_id' => $stadium->id,
            'home_team_id' => $other,
            'away_team_id' => $home,
            'scheduled_at' => '2026-09-02 18:00:00',
            'status' => 'scheduled',
        ]);

        $fixture = $this->fixtureFor($tournament, $home, $away, $stadium, '2026-09-05 20:00:00');

        $this->putJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}", [
            'scheduled_at' => '2026-09-02 18:00:00',
            'stadium_id' => $stadium->id,
        ])->assertUnprocessable()
            ->assertJsonFragment(['message' => 'هذا التوقيت محجوز لمباراة بطولة أخرى في هذا الملعب']);
    }

    private function fixtureFor(
        Tournament $tournament,
        int $home,
        int $away,
        Stadium $stadium,
        string $scheduledAt = '2026-09-01 20:00:00',
    ): Fixture {
        $match = FootballMatch::create([
            'competition_id' => $tournament->competition_id,
            'season_id' => $tournament->season_id,
            'home_team_id' => $home,
            'away_team_id' => $away,
            'stadium_id' => $stadium->id,
            'status' => 'scheduled',
            'created_by' => $this->committee->id,
        ]);

        return Fixture::create([
            'competition_id' => $tournament->competition_id,
            'season_id' => $tournament->season_id,
            'match_id' => $match->id,
            'stadium_id' => $stadium->id,
            'home_team_id' => $home,
            'away_team_id' => $away,
            'scheduled_at' => $scheduledAt,
            'status' => 'scheduled',
        ]);
    }
}
