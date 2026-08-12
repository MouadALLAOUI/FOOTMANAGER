<?php

namespace Tests\Feature\LiveMatch;

use App\Domains\Competition\Models\Competition;
use App\Domains\Competition\Models\Season;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Player\Models\Player;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LiveMatchApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->homeManager = User::factory()->approved()->create();
        $this->awayManager = User::factory()->approved()->create();
        $this->otherManager = User::factory()->approved()->create();
        $this->homeTeam = Team::factory()->create(['manager_id' => $this->homeManager->id]);
        $this->awayTeam = Team::factory()->create(['manager_id' => $this->awayManager->id]);
    }

    protected function makeMatch(array $overrides = []): FootballMatch
    {
        return FootballMatch::create(array_merge([
            'home_team_id' => $this->homeTeam->id,
            'away_team_id' => $this->awayTeam->id,
            'status' => MatchStatus::FirstHalf,
            'current_minute' => 12,
            'home_score' => 0,
            'away_score' => 0,
            'match_duration_minutes' => 90,
            'kicked_off_at' => now()->subMinutes(12),
            'created_by' => $this->homeManager->id,
        ], $overrides));
    }

    public function test_live_endpoint_lists_live_matches(): void
    {
        $this->makeMatch();

        $this->getJson('/api/v1/live')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.home_team.name', $this->homeTeam->name)
            ->assertJsonPath('data.0.status', 'first_half');
    }

    public function test_live_endpoint_ignores_finished_matches(): void
    {
        $this->makeMatch(['status' => MatchStatus::Finished, 'ended_at' => now()]);

        $this->getJson('/api/v1/live')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_show_returns_full_match_payload(): void
    {
        $match = $this->makeMatch();

        $this->getJson("/api/v1/live/{$match->id}")
            ->assertOk()
            ->assertJsonPath('data.uuid', $match->uuid)
            ->assertJsonPath('data.score.home', 0)
            ->assertJsonStructure([
                'data' => [
                    'home_team', 'away_team', 'score', 'status', 'minute', 'events', 'statistics',
                ],
            ]);
    }

    public function test_manager_of_home_team_can_start_and_record_goal(): void
    {
        $match = $this->makeMatch(['status' => MatchStatus::Scheduled, 'kicked_off_at' => null]);
        Sanctum::actingAs($this->homeManager);

        $this->postJson("/api/v1/live/{$match->id}/start")
            ->assertOk()
            ->assertJsonPath('data.status', 'first_half');

        $this->postJson("/api/v1/live/{$match->id}/events", [
            'type' => 'goal',
            'team_id' => $this->homeTeam->id,
            'minute' => 15,
        ])->assertCreated()
            ->assertJsonPath('data.type', 'goal');

        $this->assertSame(1, $match->fresh()->home_score);
    }

    public function test_unauthorized_user_cannot_manage_other_team_match(): void
    {
        $match = $this->makeMatch();
        Sanctum::actingAs($this->otherManager);

        $this->postJson("/api/v1/live/{$match->id}/start")
            ->assertForbidden();
    }

    public function test_guest_cannot_record_events(): void
    {
        $match = $this->makeMatch();

        $this->postJson("/api/v1/live/{$match->id}/events", [
            'type' => 'goal',
            'team_id' => $this->homeTeam->id,
        ])->assertUnauthorized();
    }

    public function test_cannot_record_event_for_team_not_in_match(): void
    {
        $match = $this->makeMatch();
        $intruderTeam = Team::factory()->create();

        Sanctum::actingAs($this->homeManager);

        $this->postJson("/api/v1/live/{$match->id}/events", [
            'type' => 'goal',
            'team_id' => $intruderTeam->id,
            'minute' => 15,
        ])->assertStatus(422);
    }

    public function test_can_record_goal_for_player_in_match_team(): void
    {
        $match = $this->makeMatch();
        $player = Player::factory()->create([
            'team_id' => $this->homeTeam->id,
            'status' => Player::STATUS_ACTIVE,
        ]);

        Sanctum::actingAs($this->homeManager);

        $this->postJson("/api/v1/live/{$match->id}/events", [
            'type' => 'goal',
            'team_id' => $this->homeTeam->id,
            'player_id' => $player->id,
            'minute' => 20,
        ])->assertCreated()
            ->assertJsonPath('data.type', 'goal')
            ->assertJsonPath('data.player_id', $player->id);

        $this->assertSame(1, $match->fresh()->home_score);
    }

    public function test_cannot_record_event_for_player_not_in_match(): void
    {
        $match = $this->makeMatch();
        $intruderTeam = Team::factory()->create();
        $intruderPlayer = Player::factory()->create([
            'team_id' => $intruderTeam->id,
            'status' => Player::STATUS_ACTIVE,
        ]);

        Sanctum::actingAs($this->homeManager);

        $this->postJson("/api/v1/live/{$match->id}/events", [
            'type' => 'goal',
            'team_id' => $this->homeTeam->id,
            'player_id' => $intruderPlayer->id,
            'minute' => 20,
        ])->assertStatus(422);
    }

    public function test_cannot_set_performance_for_player_not_in_match(): void
    {
        $match = $this->makeMatch();
        $intruderTeam = Team::factory()->create();
        $intruderPlayer = Player::factory()->create([
            'team_id' => $intruderTeam->id,
            'status' => Player::STATUS_ACTIVE,
        ]);

        Sanctum::actingAs($this->homeManager);

        $this->putJson("/api/v1/live/{$match->id}/performance", [
            'player_id' => $intruderPlayer->id,
            'rating' => 8,
        ])->assertStatus(422);
    }

    public function test_cannot_set_lineup_with_player_from_another_team(): void
    {
        $match = $this->makeMatch();
        $intruderPlayer = Player::factory()->create([
            'team_id' => $this->awayTeam->id,
            'status' => Player::STATUS_ACTIVE,
        ]);

        Sanctum::actingAs($this->homeManager);

        $this->putJson("/api/v1/live/{$match->id}/lineup", [
            'team_id' => $this->homeTeam->id,
            'starters' => [
                ['player_id' => $intruderPlayer->id, 'position' => 'GK'],
            ],
        ])->assertStatus(422);
    }

    public function test_finishing_updates_standings_for_competition_match(): void
    {
        $competition = Competition::create(['name' => 'أجي نقصرو Cup', 'type' => 'cup']);
        $season = Season::create(['competition_id' => $competition->id, 'name' => '2026']);

        $this->makeMatch([
            'competition_id' => $competition->id,
            'season_id' => $season->id,
            'home_score' => 2,
            'away_score' => 1,
            'status' => MatchStatus::FirstHalf,
        ]);

        Sanctum::actingAs($this->homeManager);

        $match = $this->makeMatch([
            'competition_id' => $competition->id,
            'season_id' => $season->id,
            'home_score' => 2,
            'away_score' => 1,
            'status' => MatchStatus::FirstHalf,
        ]);

        $this->postJson("/api/v1/live/{$match->id}/finish")
            ->assertOk()
            ->assertJsonPath('data.status', 'finished');

        $this->getJson("/api/v1/competitions/{$competition->id}/standings?season_id={$season->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.team_id', $this->homeTeam->id)
            ->assertJsonPath('data.0.points', 3)
            ->assertJsonPath('data.1.points', 0);
    }
}
