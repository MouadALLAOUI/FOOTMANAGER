<?php

namespace Tests\Feature;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchEventType;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\MatchDelegatedSubmission;
use App\Domains\Match\Models\MatchEvent;
use App\Domains\Match\Services\DelegatedMatchEntryService;
use App\Domains\Player\Models\Player;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\StreamsProgress;
use Tests\TestCase;

class PublicLiveMatchTest extends TestCase
{
    use DatabaseTransactions;
    use StreamsProgress;

    private function createTournamentFixture(User $organizer): array
    {
        $payload = [
            'name' => 'بطولة تجريبية '.uniqid(),
            'edition' => '1',
            'category' => 'أكابر',
            'location' => 'ملعب أجيال - تنغير',
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

        $res = $this->actingAs($organizer)->postJson('/api/committee/tournaments', $payload)->assertCreated();
        $tournament = Tournament::findOrFail($res->json('data.id'));

        $homeTeam = Team::factory()->create(['name' => 'أمل أيت بعمران']);
        $awayTeam = Team::factory()->create(['name' => 'اتحاد تنغير']);

        $match = FootballMatch::create([
            'competition_id' => $tournament->competition_id,
            'season_id' => $tournament->season_id,
            'home_team_id' => $homeTeam->id,
            'away_team_id' => $awayTeam->id,
            'status' => MatchStatus::FirstHalf,
            'current_period' => 'first_half',
            'current_minute' => 35,
            'home_score' => 1,
            'away_score' => 0,
            'created_by' => $organizer->id,
        ]);

        $fixture = Fixture::create([
            'competition_id' => $tournament->competition_id,
            'season_id' => $tournament->season_id,
            'match_id' => $match->id,
            'home_team_id' => $homeTeam->id,
            'away_team_id' => $awayTeam->id,
            'status' => 'scheduled',
            'scheduled_at' => now('Africa/Casablanca')->addHour(),
        ]);

        return [$tournament, $fixture, $match, $homeTeam, $awayTeam];
    }

    public function test_valid_public_match_link_loads_without_login_and_includes_noindex(): void
    {
        $this->step('Creating test match with public token');
        $organizer = User::factory()->committee()->approved()->create();
        [$tournament, $fixture, $match, $homeTeam, $awayTeam] = $this->createTournamentFixture($organizer);

        $token = $match->ensurePublicToken();
        $this->assertNotEmpty($token);
        $this->assertGreaterThanOrEqual(24, strlen($token));

        $this->step('Fetching public Live Match page without login');
        $response = $this->get("/live/{$token}");
        $response->assertOk();
        $response->assertSee('noindex, nofollow', false);
        $response->assertSee($homeTeam->name);
        $response->assertSee($awayTeam->name);
        $response->assertSee('أجي تقصرو');
        $response->assertSee('مشاركة المباراة عبر WhatsApp');
    }

    public function test_invalid_token_returns_404_and_does_not_reveal_match_data(): void
    {
        $this->step('Testing invalid and short tokens');
        $invalidToken = 'non-existent-token-1234567890';

        $this->get("/live/{$invalidToken}")->assertNotFound();
        $this->getJson("/live/{$invalidToken}/data")->assertNotFound();
        $this->getJson('/live/short/data')->assertNotFound();
    }

    public function test_public_endpoint_is_strictly_read_only(): void
    {
        $this->step('Verifying public endpoint cannot accept modifications');
        $organizer = User::factory()->committee()->approved()->create();
        [$tournament, $fixture, $match] = $this->createTournamentFixture($organizer);
        $token = $match->ensurePublicToken();

        $this->postJson("/live/{$token}", ['home_score' => 5])->assertStatus(405);
        $this->putJson("/live/{$token}", ['home_score' => 5])->assertStatus(405);
        $this->deleteJson("/live/{$token}")->assertStatus(405);
    }

    public function test_public_match_data_does_not_expose_delegate_token(): void
    {
        $this->step('Generating secret delegate link and ensuring it is not leaked');
        $organizer = User::factory()->committee()->approved()->create();
        [$tournament, $fixture, $match] = $this->createTournamentFixture($organizer);

        $delegatedService = app(DelegatedMatchEntryService::class);
        $delegateResult = $delegatedService->generateToken($tournament, $fixture, $organizer->id);
        $plainDelegateToken = $delegateResult['token'];

        $publicToken = $match->ensurePublicToken();
        $response = $this->getJson("/live/{$publicToken}/data");
        $response->assertOk();

        $content = $response->getContent();
        $this->assertStringNotContainsString($plainDelegateToken, $content);
        $this->assertStringNotContainsString('match-entry', $content);
    }

    public function test_incremental_polling_returns_new_events_and_updated_events(): void
    {
        $this->step('Adding match events and testing incremental polling');
        $organizer = User::factory()->committee()->approved()->create();
        [$tournament, $fixture, $match, $homeTeam, $awayTeam] = $this->createTournamentFixture($organizer);
        $playerA = Player::factory()->create(['team_id' => $homeTeam->id, 'name' => 'أحمد البهجة']);
        $playerB = Player::factory()->create(['team_id' => $homeTeam->id, 'name' => 'صلاح الدين بصير']);

        $event1 = MatchEvent::create([
            'match_id' => $match->id,
            'team_id' => $homeTeam->id,
            'player_id' => $playerA->id,
            'type' => MatchEventType::Goal,
            'minute' => 20,
            'description' => 'أحمد البهجة',
        ]);

        $publicToken = $match->ensurePublicToken();

        // 1. Initial request: gets event1
        $res1 = $this->getJson("/live/{$publicToken}/data")->assertOk();
        $data1 = $res1->json();
        $this->assertCount(1, $data1['events']);
        $this->assertEquals($event1->id, $data1['events'][0]['id']);

        // 2. Poll with since_id: no new events
        $res2 = $this->getJson("/live/{$publicToken}/data?since_id={$event1->id}&since_time=".urlencode(now()->toIso8601String()))->assertOk();
        $data2 = $res2->json();
        $this->assertCount(0, $data2['events']);

        // 3. Add second event
        $event2 = MatchEvent::create([
            'match_id' => $match->id,
            'team_id' => $awayTeam->id,
            'type' => MatchEventType::YellowCard,
            'minute' => 40,
            'description' => 'إنذار',
        ]);

        $res3 = $this->getJson("/live/{$publicToken}/data?since_id={$event1->id}&since_time=".urlencode(now()->toIso8601String()))->assertOk();
        $data3 = $res3->json();
        $this->assertCount(1, $data3['events']);
        $this->assertEquals($event2->id, $data3['events'][0]['id']);

        // 4. Update player on event1 (committee correction)
        $timeBeforeUpdate = now()->subSeconds(2)->toIso8601String();
        $event1->update([
            'player_id' => $playerB->id,
            'description' => 'صلاح الدين بصير',
        ]);

        $res4 = $this->getJson("/live/{$publicToken}/data?since_id={$event2->id}&since_time=".urlencode($timeBeforeUpdate))->assertOk();
        $data4 = $res4->json();
        $this->assertNotEmpty($data4['updated_events']);
        $this->assertEquals($event1->id, $data4['updated_events'][0]['id']);
        $this->assertEquals('صلاح الدين بصير', $data4['updated_events'][0]['player_name']);
    }

    public function test_unofficial_label_displayed_during_pending_submission_and_removed_on_approval(): void
    {
        $this->step('Testing official vs unofficial approval state');
        $organizer = User::factory()->committee()->approved()->create();
        [$tournament, $fixture, $match] = $this->createTournamentFixture($organizer);

        $delegatedService = app(DelegatedMatchEntryService::class);
        $tokenRecord = $delegatedService->generateToken($tournament, $fixture, $organizer->id);

        // Record a pending delegated submission
        MatchDelegatedSubmission::create([
            'fixture_id' => $fixture->id,
            'match_delegated_token_id' => 1,
            'home_score' => 2,
            'away_score' => 1,
            'status' => 'pending',
            'recorder_name' => 'مندوب معتمد',
            'recorder_phone' => '0612345678',
        ]);

        $publicToken = $match->ensurePublicToken();
        $res = $this->getJson("/live/{$publicToken}/data")->assertOk();
        $this->assertFalse($res->json('match.is_official'));
        $this->assertEquals('pending', $res->json('match.approval_status'));
        $this->assertEquals('النتيجة غير رسمية', $res->json('match.official_label'));

        // Once approved
        MatchDelegatedSubmission::where('fixture_id', $fixture->id)->update(['status' => 'approved']);
        $resApproved = $this->getJson("/live/{$publicToken}/data")->assertOk();
        $this->assertTrue($resApproved->json('match.is_official'));
        $this->assertNull($resApproved->json('match.official_label'));
    }

    public function test_score_mapping_and_team_order_are_strictly_authoritative(): void
    {
        $this->step('Testing score mapping and team identity consistency');
        $organizer = User::factory()->committee()->approved()->create();
        [$tournament, $fixture, $match, $homeTeam, $awayTeam] = $this->createTournamentFixture($organizer);

        // Update match with home = 0, away = 3
        $match->update([
            'home_score' => 0,
            'away_score' => 3,
        ]);

        $publicToken = $match->ensurePublicToken();
        $response = $this->getJson("/live/{$publicToken}/data")->assertOk();
        $data = $response->json();

        // Check authoritative team-score associations in API payload
        $this->assertEquals($homeTeam->id, $data['match']['home_team']['id']);
        $this->assertEquals($awayTeam->id, $data['match']['away_team']['id']);
        $this->assertEquals(0, $data['match']['home_score']);
        $this->assertEquals(3, $data['match']['away_score']);
        $this->assertEquals(0, $data['match']['home_team']['score']);
        $this->assertEquals(3, $data['match']['away_team']['score']);

        // Check HTML page contains correct team and score associations
        $pageResponse = $this->get("/live/{$publicToken}")->assertOk();
        $pageContent = $pageResponse->getContent();
        $this->assertStringContainsString($homeTeam->name, $pageContent);
        $this->assertStringContainsString($awayTeam->name, $pageContent);
    }

    public function test_lineup_displays_authoritative_roster_and_distinguishes_starters_and_subs(): void
    {
        $this->step('Testing lineup resolution with starters and substitutes');
        $organizer = User::factory()->committee()->approved()->create();
        [$tournament, $fixture, $match, $homeTeam, $awayTeam] = $this->createTournamentFixture($organizer);

        $starterPlayer = Player::factory()->create(['team_id' => $homeTeam->id, 'name' => 'طارق السكتيوي', 'shirt_number' => 10]);
        $benchPlayer = Player::factory()->create(['team_id' => $homeTeam->id, 'name' => 'يوسف شيبو', 'shirt_number' => 7]);

        \App\Domains\Match\Models\MatchLineup::create([
            'match_id' => $match->id,
            'team_id' => $homeTeam->id,
            'player_id' => $starterPlayer->id,
            'is_starter' => true,
            'position' => 'مهاجم',
            'shirt_number' => 10,
        ]);

        \App\Domains\Match\Models\MatchLineup::create([
            'match_id' => $match->id,
            'team_id' => $homeTeam->id,
            'player_id' => $benchPlayer->id,
            'is_starter' => false,
            'position' => 'وسط',
            'shirt_number' => 7,
        ]);

        $publicToken = $match->ensurePublicToken();
        $response = $this->getJson("/live/{$publicToken}/data")->assertOk();
        $lineup = $response->json('lineup');

        $this->assertNotNull($lineup);
        $this->assertTrue($lineup['available']);
        $this->assertTrue($lineup['has_starters']);
        $this->assertCount(1, $lineup['home']['starters']);
        $this->assertEquals('طارق السكتيوي', $lineup['home']['starters'][0]['name']);
        $this->assertEquals('starter', $lineup['home']['starters'][0]['participation_status']);
        $this->assertCount(1, $lineup['home']['substitutes']);
        $this->assertEquals('يوسف شيبو', $lineup['home']['substitutes'][0]['name']);
        $this->assertEquals('bench', $lineup['home']['substitutes'][0]['participation_status']);

        // Check HTML page displays lineup section
        $pageResponse = $this->get("/live/{$publicToken}")->assertOk();
        $pageContent = $pageResponse->getContent();
        $this->assertStringContainsString('التشكيلة الحاضرة', $pageContent);
        $this->assertStringContainsString('طارق السكتيوي', $pageContent);
        $this->assertStringContainsString('يوسف شيبو', $pageContent);
    }
}

