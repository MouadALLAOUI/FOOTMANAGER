<?php

namespace Tests\Feature\Match;

use App\Domains\Match\Models\MatchRequest;
use App\Domains\Match\Models\PlayerMatchRequest;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NeedPlayersApiTest extends TestCase
{
    use RefreshDatabase;

    private function managerWithTeam(): array
    {
        $manager = User::factory()->approved()->create(['role' => 'manager']);
        $team = Team::factory()->create(['manager_id' => $manager->id]);

        return [$manager, $team];
    }

    private function player(): User
    {
        return User::factory()->approved()->create(['role' => 'player']);
    }

    public function test_create_match_with_players_needed(): void
    {
        [$manager] = $this->managerWithTeam();
        $stadium = Stadium::factory()->create();

        $this->actingAs($manager)
            ->postJson('/api/manager/match-requests', [
                'stadium_id' => $stadium->id,
                'match_datetime' => now()->addDay()->toDateTimeString(),
                'start_time' => '20:00',
                'needs_players' => true,
                'players_needed' => 2,
            ])
            ->assertStatus(201)
            ->assertJsonPath('match_request.needs_players', true)
            ->assertJsonPath('match_request.players_needed', 2)
            ->assertJsonPath('match_request.players_joined', 0)
            ->assertJsonPath('match_request.players_remaining', 2);
    }

    public function test_create_match_without_needs_players_clears_count(): void
    {
        [$manager] = $this->managerWithTeam();
        $stadium = Stadium::factory()->create();

        $this->actingAs($manager)
            ->postJson('/api/manager/match-requests', [
                'stadium_id' => $stadium->id,
                'match_datetime' => now()->addDay()->toDateTimeString(),
                'start_time' => '20:00',
                'needs_players' => false,
                'players_needed' => 5,
            ])
            ->assertStatus(201)
            ->assertJsonPath('match_request.needs_players', false)
            ->assertJsonPath('match_request.players_needed', null)
            ->assertJsonPath('match_request.players_joined', 0);
    }

    public function test_create_match_requires_players_needed_when_enabled(): void
    {
        [$manager] = $this->managerWithTeam();
        $stadium = Stadium::factory()->create();

        $this->actingAs($manager)
            ->postJson('/api/manager/match-requests', [
                'stadium_id' => $stadium->id,
                'match_datetime' => now()->addDay()->toDateTimeString(),
                'start_time' => '20:00',
                'needs_players' => true,
            ])
            ->assertStatus(422);
    }

    public function test_create_match_rejects_zero_players_needed(): void
    {
        [$manager] = $this->managerWithTeam();
        $stadium = Stadium::factory()->create();

        $this->actingAs($manager)
            ->postJson('/api/manager/match-requests', [
                'stadium_id' => $stadium->id,
                'match_datetime' => now()->addDay()->toDateTimeString(),
                'start_time' => '20:00',
                'needs_players' => true,
                'players_needed' => 0,
            ])
            ->assertStatus(422);
    }

    public function test_accept_incoming_match_with_players_needed(): void
    {
        [$hostManager, $hostTeam] = $this->managerWithTeam();
        [$acceptingManager, $acceptingTeam] = $this->managerWithTeam();

        $match = MatchRequest::factory()->create([
            'host_team_id' => $hostTeam->id,
            'status' => 'open',
            'match_datetime' => now()->addDay()->toDateTimeString(),
        ]);

        $this->actingAs($acceptingManager)
            ->postJson("/api/manager/match-requests/{$match->id}/accept", [
                'needs_players' => true,
                'players_needed' => 3,
            ])
            ->assertStatus(200)
            ->assertJsonPath('match_request.status', 'accepted')
            ->assertJsonPath('match_request.opponent_team_id', $acceptingTeam->id)
            ->assertJsonPath('match_request.needs_players', true)
            ->assertJsonPath('match_request.players_needed', 3);
    }

    public function test_manager_accepts_player_application_under_capacity(): void
    {
        [$manager, $team] = $this->managerWithTeam();

        $match = MatchRequest::factory()->create([
            'host_team_id' => $team->id,
            'status' => 'open',
            'needs_players' => true,
            'players_needed' => 2,
            'match_datetime' => now()->addDay()->toDateTimeString(),
        ]);

        $application = PlayerMatchRequest::create([
            'player_id' => $this->player()->id,
            'match_request_id' => $match->id,
            'type' => 'apply',
            'status' => 'pending',
        ]);

        $this->actingAs($manager)
            ->putJson("/api/manager/recruitment/applications/{$application->id}/respond", ['action' => 'accept'])
            ->assertStatus(200)
            ->assertJsonPath('application.status', 'accepted');

        $fresh = $match->fresh();
        $this->assertSame(1, $fresh->players_joined);
        $this->assertSame('open', $fresh->status);
    }

    public function test_manager_cannot_accept_application_over_capacity(): void
    {
        [$manager, $team] = $this->managerWithTeam();

        $match = MatchRequest::factory()->create([
            'host_team_id' => $team->id,
            'status' => 'open',
            'needs_players' => true,
            'players_needed' => 1,
            'match_datetime' => now()->addDay()->toDateTimeString(),
        ]);

        PlayerMatchRequest::create([
            'player_id' => $this->player()->id,
            'match_request_id' => $match->id,
            'type' => 'apply',
            'status' => 'accepted',
        ]);

        $second = PlayerMatchRequest::create([
            'player_id' => $this->player()->id,
            'match_request_id' => $match->id,
            'type' => 'apply',
            'status' => 'pending',
        ]);

        $this->actingAs($manager)
            ->putJson("/api/manager/recruitment/applications/{$second->id}/respond", ['action' => 'accept'])
            ->assertStatus(422);
    }

    public function test_player_cannot_apply_to_overlapping_accepted_match(): void
    {
        [$hostManager, $hostTeam] = $this->managerWithTeam();
        [$otherManager, $otherTeam] = $this->managerWithTeam();
        $player = $this->player();

        $datetime = now()->addDay()->toDateTimeString();

        $matchA = MatchRequest::factory()->create([
            'host_team_id' => $hostTeam->id,
            'status' => 'open',
            'needs_players' => true,
            'players_needed' => 2,
            'match_datetime' => $datetime,
        ]);

        $matchB = MatchRequest::factory()->create([
            'host_team_id' => $otherTeam->id,
            'status' => 'open',
            'needs_players' => true,
            'players_needed' => 2,
            'match_datetime' => now()->addDay()->addHour()->toDateTimeString(),
        ]);

        PlayerMatchRequest::create([
            'player_id' => $player->id,
            'match_request_id' => $matchA->id,
            'type' => 'apply',
            'status' => 'accepted',
        ]);

        $this->actingAs($player)
            ->postJson("/api/player/matches/{$matchB->id}/apply")
            ->assertStatus(422);
    }

    public function test_duplicate_apply_is_rejected(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $player = $this->player();

        $match = MatchRequest::factory()->create([
            'host_team_id' => $team->id,
            'status' => 'open',
            'needs_players' => true,
            'players_needed' => 2,
            'match_datetime' => now()->addDay()->toDateTimeString(),
        ]);

        PlayerMatchRequest::create([
            'player_id' => $player->id,
            'match_request_id' => $match->id,
            'type' => 'apply',
            'status' => 'pending',
        ]);

        $this->actingAs($player)
            ->postJson("/api/player/matches/{$match->id}/apply")
            ->assertStatus(409);
    }

    public function test_start_match_transitions_to_live(): void
    {
        [$manager, $team] = $this->managerWithTeam();

        $match = MatchRequest::factory()->create([
            'host_team_id' => $team->id,
            'status' => 'open',
            'match_datetime' => now()->addHour()->toDateTimeString(),
        ]);

        $this->actingAs($manager)
            ->postJson("/api/manager/match-requests/{$match->id}/start")
            ->assertStatus(200)
            ->assertJsonPath('match_request.status', 'live');

        $this->assertNotNull($match->fresh()->started_at);
    }

    public function test_non_participant_cannot_start_match(): void
    {
        [$hostManager, $hostTeam] = $this->managerWithTeam();
        [$intruderManager] = $this->managerWithTeam();

        $match = MatchRequest::factory()->create([
            'host_team_id' => $hostTeam->id,
            'status' => 'open',
            'match_datetime' => now()->addHour()->toDateTimeString(),
        ]);

        $this->actingAs($intruderManager)
            ->postJson("/api/manager/match-requests/{$match->id}/start")
            ->assertStatus(403);
    }

    public function test_cannot_start_invalid_status(): void
    {
        [$manager, $team] = $this->managerWithTeam();

        $match = MatchRequest::factory()->create([
            'host_team_id' => $team->id,
            'status' => 'completed',
            'match_datetime' => now()->subDay()->toDateTimeString(),
        ]);

        $this->actingAs($manager)
            ->postJson("/api/manager/match-requests/{$match->id}/start")
            ->assertStatus(404);
    }
}
