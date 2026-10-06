<?php

namespace Tests\Feature;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Models\MatchDelegatedSubmission;
use App\Domains\Match\Models\MatchDelegatedToken;
use App\Domains\Match\Services\DelegatedMatchEntryService;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class DelegatedMatchEntryTest extends TestCase
{
    use DatabaseTransactions;

    private function createTournament(User $organizer): Tournament
    {
        $payload = [
            'name' => 'بطولة تجريبية '.uniqid(),
            'edition' => '1',
            'category' => 'أكابر',
            'location' => 'الملعب الرئيسي',
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
        ];

        $response = $this->actingAs($organizer)->postJson('/api/committee/tournaments', $payload)->assertCreated();

        return Tournament::findOrFail($response->json('data.id'));
    }

    public function test_can_generate_secret_token_and_retrieve_fixture(): void
    {
        $organizer = User::factory()->committee()->approved()->create();
        $tournament = $this->createTournament($organizer);
        $homeTeam = Team::factory()->create();
        $awayTeam = Team::factory()->create();

        $fixture = Fixture::create([
            'competition_id' => $tournament->competition_id,
            'season_id' => $tournament->season_id,
            'home_team_id' => $homeTeam->id,
            'away_team_id' => $awayTeam->id,
            'status' => 'scheduled',
            'scheduled_at' => now('Africa/Casablanca')->addHour(),
        ]);

        $service = app(DelegatedMatchEntryService::class);
        $result = $service->generateToken($tournament, $fixture, $organizer->id);

        $this->assertNotEmpty($result['token']);
        $this->assertStringContainsString('match-entry/', $result['url']);
        $this->assertStringContainsString('صالح حتى', $result['share_text']);

        // Verify public route access without authentication
        $response = $this->getJson("/api/v1/match-entry/{$result['token']}");
        $response->assertStatus(200);
        $response->assertJsonPath('data.fixture.id', $fixture->id);
        $response->assertJsonPath('data.fixture.home_team.id', $homeTeam->id);
    }

    public function test_recorder_identification_and_result_submission_pending_approval(): void
    {
        $organizer = User::factory()->committee()->approved()->create();
        $tournament = $this->createTournament($organizer);
        $homeManager = User::factory()->approved()->create(['role' => 'manager']);
        $awayManager = User::factory()->approved()->create(['role' => 'manager']);

        $homeTeam = Team::factory()->create(['manager_id' => $homeManager->id]);
        $awayTeam = Team::factory()->create(['manager_id' => $awayManager->id]);

        $fixture = Fixture::create([
            'competition_id' => $tournament->competition_id,
            'season_id' => $tournament->season_id,
            'home_team_id' => $homeTeam->id,
            'away_team_id' => $awayTeam->id,
            'status' => 'scheduled',
            'scheduled_at' => now('Africa/Casablanca'),
        ]);

        $service = app(DelegatedMatchEntryService::class);
        $gen = $service->generateToken($tournament, $fixture, $organizer->id);
        $token = $gen['token'];

        // 1. Identify
        $idResponse = $this->postJson("/api/v1/match-entry/{$token}/identify", [
            'recorder_name' => 'يوسف الإدريسي',
            'recorder_phone' => '0612345678',
        ]);
        $idResponse->assertStatus(200);

        // 2. Submit Result
        $subResponse = $this->postJson("/api/v1/match-entry/{$token}/submit", [
            'recorder_name' => 'يوسف الإدريسي',
            'recorder_phone' => '0612345678',
            'home_score' => 2,
            'away_score' => 1,
            'extra_time' => false,
            'events' => [],
        ]);
        $subResponse->assertStatus(201);
        $subResponse->assertJsonPath('data.status', 'pending');

        // Verify database state: fixture match is NOT yet finished (remains pending until organizer approval)
        $fixture->refresh();
        $this->assertNotEquals('finished', $fixture->status?->value);

        // 3. Manager can dispute
        $disputeResponse = $this->actingAs($awayManager)->postJson("/api/manager/fixtures/{$fixture->id}/dispute-result", [
            'reason' => 'الهدف الثاني جاء من تسلل واضح',
        ]);
        $disputeResponse->assertStatus(200);

        $submission = MatchDelegatedSubmission::where('fixture_id', $fixture->id)->first();
        $this->assertTrue((bool) $submission->is_disputed);
        $this->assertEquals('الهدف الثاني جاء من تسلل واضح', $submission->dispute_reason);
    }

    public function test_anomaly_flags_detected_on_unusual_score(): void
    {
        $organizer = User::factory()->committee()->approved()->create();
        $tournament = $this->createTournament($organizer);
        $homeTeam = Team::factory()->create();
        $awayTeam = Team::factory()->create();

        $fixture = Fixture::create([
            'competition_id' => $tournament->competition_id,
            'season_id' => $tournament->season_id,
            'home_team_id' => $homeTeam->id,
            'away_team_id' => $awayTeam->id,
            'status' => 'scheduled',
            'scheduled_at' => now('Africa/Casablanca'),
        ]);

        $service = app(DelegatedMatchEntryService::class);
        $gen = $service->generateToken($tournament, $fixture, $organizer->id);

        $subResponse = $this->postJson("/api/v1/match-entry/{$gen['token']}/submit", [
            'recorder_name' => 'حكم المباراة',
            'recorder_phone' => '0699999999',
            'home_score' => 8,
            'away_score' => 4, // total 12 goals >= 10 anomaly
            'events' => [],
        ]);
        $subResponse->assertStatus(201);

        $submission = MatchDelegatedSubmission::where('fixture_id', $fixture->id)->first();
        $this->assertContains('unusual_score', $submission->anomalies);
    }
}
