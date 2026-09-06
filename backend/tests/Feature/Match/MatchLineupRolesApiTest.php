<?php

namespace Tests\Feature\Match;

use App\Domains\Match\Models\MatchLineup;
use App\Domains\Match\Models\MatchRequest;
use App\Domains\Player\Models\Player;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\StreamsProgress;
use Tests\TestCase;

class MatchLineupRolesApiTest extends TestCase
{
    use RefreshDatabase;
    use StreamsProgress;

    private function managerWithTeam(): array
    {
        $manager = User::factory()->approved()->create(['role' => 'manager']);
        $team = Team::factory()->create(['manager_id' => $manager->id]);

        return [$manager, $team];
    }

    private function openMatchRequest(Team $host, Team $opponent, string $format = '5v5'): MatchRequest
    {
        return MatchRequest::create([
            'host_team_id' => $host->id,
            'opponent_team_id' => $opponent->id,
            'player_format' => $format,
            'match_datetime' => now()->addDays(2),
            'status' => 'open',
            'stadium_id' => null,
        ]);
    }

    private function lineupPayload(array $players, array $extra = []): array
    {
        return array_merge(['players' => $players], $extra);
    }

    private function starter(Player $player, int $index = 0, array $overrides = []): array
    {
        return array_merge([
            'player_id' => $player->id,
            'is_starter' => true,
            'tactical_position' => 'GK',
            'x' => 0.5,
            'y' => 0.1,
            'order_index' => $index,
        ], $overrides);
    }

    private function bench(Player $player, array $overrides = []): array
    {
        return array_merge([
            'player_id' => $player->id,
            'is_starter' => false,
            'order_index' => 0,
        ], $overrides);
    }

    public function test_lineup_saves_tactical_positions_and_roles(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $opponent = Team::factory()->create();
        $matchRequest = $this->openMatchRequest($team, $opponent);

        $captain = Player::factory()->create(['team_id' => $team->id]);
        $penaltyTaker = Player::factory()->create(['team_id' => $team->id]);
        $rest = Player::factory()->count(3)->create(['team_id' => $team->id]);

        $this->actingAs($manager)
            ->putJson("/api/manager/match-requests/{$matchRequest->id}/lineup", $this->lineupPayload([
                $this->starter($captain, 0, ['is_captain' => true, 'tactical_position' => 'CB', 'x' => 0.3, 'y' => 0.35]),
                $this->starter($penaltyTaker, 1, ['is_penalty_taker' => true, 'tactical_position' => 'ST', 'x' => 0.5, 'y' => 0.8]),
                $this->starter($rest[0], 2),
                $this->starter($rest[1], 3),
                $this->starter($rest[2], 4),
                $this->bench(Player::factory()->create(['team_id' => $team->id])),
            ], ['formation' => ['format' => '5v5', 'preset_key' => '5v5_2_2', 'formation' => '2-2']]))
            ->assertOk()
            ->assertJsonPath('message', 'تم حفظ التشكيلة بنجاح');

        $captainRow = MatchLineup::where('match_request_id', $matchRequest->id)->where('player_id', $captain->id)->first();
        $this->assertTrue($captainRow->is_captain);
        $this->assertSame('CB', $captainRow->tactical_position);
        $this->assertSame('defender', $captainRow->role);
        $this->assertEqualsWithDelta(0.3, (float) $captainRow->x, 0.001);

        $penaltyRow = MatchLineup::where('match_request_id', $matchRequest->id)->where('player_id', $penaltyTaker->id)->first();
        $this->assertTrue($penaltyRow->is_penalty_taker);

        $this->assertDatabaseHas('match_formation_snapshots', [
            'match_request_id' => $matchRequest->id,
            'team_id' => $team->id,
            'preset_key' => '5v5_2_2',
            'formation' => '2-2',
        ]);
    }

    public function test_lineup_roles_are_auto_cleared_for_bench_players(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $opponent = Team::factory()->create();
        $matchRequest = $this->openMatchRequest($team, $opponent);

        $captain = Player::factory()->create(['team_id' => $team->id]);
        $rest = Player::factory()->count(4)->create(['team_id' => $team->id]);

        $this->actingAs($manager)
            ->putJson("/api/manager/match-requests/{$matchRequest->id}/lineup", $this->lineupPayload([
                $this->starter($captain, 0),
                $this->starter($rest[0], 1),
                $this->starter($rest[1], 2),
                $this->starter($rest[2], 3),
                $this->starter($rest[3], 4),
            ]))
            ->assertOk();

        // Move the captain to the bench with the flag still set: the backend
        // must clear the role because role holders must be starters.
        $this->actingAs($manager)
            ->putJson("/api/manager/match-requests/{$matchRequest->id}/lineup", $this->lineupPayload([
                $this->starter($rest[0], 0),
                $this->starter($rest[1], 1),
                $this->starter($rest[2], 2),
                $this->starter($rest[3], 3),
                $this->starter(Player::factory()->create(['team_id' => $team->id]), 4),
                $this->bench($captain, ['is_captain' => true]),
            ]))
            ->assertOk();

        $captainRow = MatchLineup::where('match_request_id', $matchRequest->id)->where('player_id', $captain->id)->first();
        $this->assertFalse((bool) $captainRow->is_captain);
        $this->assertFalse((bool) $captainRow->is_starter);

        $this->assertSame(0, MatchLineup::where('match_request_id', $matchRequest->id)->where('is_captain', true)->count());
    }

    public function test_formation_snapshot_does_not_mutate_team_formation(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $opponent = Team::factory()->create();
        $matchRequest = $this->openMatchRequest($team, $opponent);

        $players = Player::factory()->count(5)->create(['team_id' => $team->id]);
        $payload = array_map(fn (Player $p, int $i) => $this->starter($p, $i), $players->all(), array_keys($players->all()));

        $this->actingAs($manager)
            ->putJson("/api/manager/match-requests/{$matchRequest->id}/lineup", $this->lineupPayload($payload, [
                'formation' => ['format' => '5v5', 'preset_key' => '5v5_2_2', 'formation' => '2-2'],
            ]))
            ->assertOk();

        $this->assertDatabaseHas('match_formation_snapshots', [
            'match_request_id' => $matchRequest->id,
            'team_id' => $team->id,
        ]);
        // The team's saved formations must remain untouched.
        $this->assertDatabaseCount('team_formations', 0);
        $this->assertDatabaseCount('formation_players', 0);
    }

    public function test_role_endpoint_rejects_bench_player(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $opponent = Team::factory()->create();
        $matchRequest = $this->openMatchRequest($team, $opponent);

        $benchPlayer = Player::factory()->create(['team_id' => $team->id]);
        $players = Player::factory()->count(5)->create(['team_id' => $team->id]);

        $payload = array_map(fn (Player $p, int $i) => $this->starter($p, $i), $players->all(), array_keys($players->all()));
        $payload[] = $this->bench($benchPlayer);

        $this->actingAs($manager)
            ->putJson("/api/manager/match-requests/{$matchRequest->id}/lineup", $this->lineupPayload($payload))
            ->assertOk();

        $this->actingAs($manager)
            ->putJson("/api/manager/match-requests/{$matchRequest->id}/lineup/captain", ['player_id' => $benchPlayer->id])
            ->assertStatus(422);
    }

    public function test_penalty_and_corner_role_endpoints_assign_roles(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $opponent = Team::factory()->create();
        $matchRequest = $this->openMatchRequest($team, $opponent);

        $players = Player::factory()->count(5)->create(['team_id' => $team->id]);
        $payload = array_map(fn (Player $p, int $i) => $this->starter($p, $i), $players->all(), array_keys($players->all()));

        $this->actingAs($manager)
            ->putJson("/api/manager/match-requests/{$matchRequest->id}/lineup", $this->lineupPayload($payload))
            ->assertOk();

        $this->actingAs($manager)
            ->putJson("/api/manager/match-requests/{$matchRequest->id}/lineup/penalty", ['player_id' => $players[0]->id])
            ->assertOk()
            ->assertJsonPath('message', 'تم تعيين لاعب ركلات الجزاء بنجاح');

        $this->actingAs($manager)
            ->putJson("/api/manager/match-requests/{$matchRequest->id}/lineup/corner", ['player_id' => $players[1]->id])
            ->assertOk()
            ->assertJsonPath('message', 'تم تعيين لاعب الركنيات بنجاح');

        $this->assertTrue((bool) MatchLineup::where('match_request_id', $matchRequest->id)->where('player_id', $players[0]->id)->first()->is_penalty_taker);
        $this->assertTrue((bool) MatchLineup::where('match_request_id', $matchRequest->id)->where('player_id', $players[1]->id)->first()->is_corner_taker);
    }

    public function test_lineup_rejects_more_starters_than_required(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $opponent = Team::factory()->create();
        $matchRequest = $this->openMatchRequest($team, $opponent);

        $players = Player::factory()->count(6)->create(['team_id' => $team->id]);
        $payload = array_map(fn (Player $p, int $i) => $this->starter($p, $i), $players->all(), array_keys($players->all()));

        $this->actingAs($manager)
            ->putJson("/api/manager/match-requests/{$matchRequest->id}/lineup", $this->lineupPayload($payload))
            ->assertStatus(422);
    }

    public function test_index_returns_tactical_data_and_formation_snapshot(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $opponent = Team::factory()->create();
        $matchRequest = $this->openMatchRequest($team, $opponent);

        $players = Player::factory()->count(5)->create(['team_id' => $team->id]);
        $payload = array_map(fn (Player $p, int $i) => $this->starter($p, $i, ['tactical_position' => 'CM', 'x' => 0.5, 'y' => 0.5]), $players->all(), array_keys($players->all()));

        $this->actingAs($manager)
            ->putJson("/api/manager/match-requests/{$matchRequest->id}/lineup", $this->lineupPayload($payload, [
                'formation' => ['format' => '5v5', 'preset_key' => '5v5_2_2', 'formation' => '2-2'],
            ]))
            ->assertOk();

        $this->actingAs($manager)
            ->getJson("/api/manager/match-requests/{$matchRequest->id}/lineup")
            ->assertOk()
            ->assertJsonPath('lineups.0.formation.preset_key', '5v5_2_2')
            ->assertJsonPath('lineups.0.starters.0.tactical_position', 'CM')
            ->assertJsonPath('lineups.0.starters.0.x', 0.5);
    }
}