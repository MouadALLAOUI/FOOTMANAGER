<?php

namespace Tests\Feature\Team;

use App\Domains\Player\Models\Player;
use App\Domains\Team\Models\FormationPreset;
use App\Domains\Team\Models\Team;
use App\Domains\Team\Models\TeamFormation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Concerns\StreamsProgress;

class TeamFormationApiTest extends TestCase
{
    use RefreshDatabase;
    use StreamsProgress;

    private function managerWithTeam(): array
    {
        $manager = User::factory()->approved()->create(['role' => 'manager']);
        $team = Team::factory()->create(['manager_id' => $manager->id]);

        return [$manager, $team];
    }

    private function teamPlayer(Team $team, array $attributes = []): Player
    {
        return Player::factory()->create(array_merge(['team_id' => $team->id], $attributes));
    }

    private function starterPayload(Player $player, array $overrides = []): array
    {
        return array_merge([
            'player_id' => $player->id,
            'is_starter' => true,
            'tactical_position' => 'GK',
            'x' => 0.5,
            'y' => 0.1,
        ], $overrides);
    }

    private function formationPayload(string $format, array $overrides = []): array
    {
        return array_merge([
            'name' => 'الخطة الأساسية',
            'format' => $format,
            'players' => [],
        ], $overrides);
    }

    public function test_manager_can_create_formation(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('5v5', [
                'name' => 'خطة الهجوم السريع',
                'preset_key' => '5v5_2_2',
                'players' => [
                    $this->starterPayload($this->teamPlayer($team), ['tactical_position' => 'CB', 'x' => 0.3, 'y' => 0.4]),
                    ['player_id' => $this->teamPlayer($team)->id, 'is_starter' => false],
                ],
            ]))
            ->assertStatus(201)
            ->assertJsonPath('data.name', 'خطة الهجوم السريع')
            ->assertJsonPath('data.format', '5v5')
            ->assertJsonPath('data.preset_key', '5v5_2_2')
            ->assertJsonPath('data.starters_count', 1)
            ->assertJsonPath('data.substitutes_count', 1);

        $this->assertDatabaseCount('formation_players', 2);
    }

    public function test_manager_can_load_formation(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $formation = TeamFormation::create(['team_id' => $team->id, 'name' => 'الدفاع', 'format' => '7v7', 'is_active' => true]);
        $player = $this->teamPlayer($team);
        $formation->players()->create(['player_id' => $player->id, 'tactical_position' => 'GK', 'role' => 'goalkeeper', 'x' => 0.5, 'y' => 0.08, 'is_starter' => true]);

        $this->actingAs($manager)
            ->getJson("/api/manager/team/formations/{$formation->id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'الدفاع')
            ->assertJsonPath('data.players.0.player_id', $player->id)
            ->assertJsonPath('data.players.0.x', 0.5)
            ->assertJsonPath('data.players.0.tactical_position', 'GK');
    }

    public function test_manager_can_update_formation(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $formation = TeamFormation::create(['team_id' => $team->id, 'name' => 'القديمة', 'format' => '5v5']);
        $player = $this->teamPlayer($team);

        $this->actingAs($manager)
            ->putJson("/api/manager/team/formations/{$formation->id}", $this->formationPayload('5v5', [
                'name' => 'المعدلة',
                'players' => [$this->starterPayload($player)],
            ]))
            ->assertOk()
            ->assertJsonPath('data.name', 'المعدلة');

        $formation->refresh();
        $this->assertSame('المعدلة', $formation->name);
        $this->assertSame(1, $formation->players()->count());
    }

    public function test_manager_can_delete_formation(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $formation = TeamFormation::create(['team_id' => $team->id, 'name' => 'للحذف', 'format' => '5v5']);
        $formation->players()->create(['player_id' => $this->teamPlayer($team)->id, 'is_starter' => true]);

        $this->actingAs($manager)
            ->deleteJson("/api/manager/team/formations/{$formation->id}")
            ->assertOk();

        $this->assertDatabaseMissing('team_formations', ['id' => $formation->id]);
        $this->assertDatabaseMissing('formation_players', ['formation_id' => $formation->id]);
    }

    public function test_valid_5v5_formation_with_five_starters(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $players = Player::factory()->count(5)->create(['team_id' => $team->id]);

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('5v5', [
                'players' => [
                    $this->starterPayload($players[0]),
                    $this->starterPayload($players[1], ['tactical_position' => 'CB', 'x' => 0.3, 'y' => 0.35]),
                    $this->starterPayload($players[2], ['tactical_position' => 'CB', 'x' => 0.7, 'y' => 0.35]),
                    $this->starterPayload($players[3], ['tactical_position' => 'ST', 'x' => 0.3, 'y' => 0.75]),
                    $this->starterPayload($players[4], ['tactical_position' => 'ST', 'x' => 0.7, 'y' => 0.75]),
                ],
            ]))
            ->assertStatus(201)
            ->assertJsonPath('data.starters_count', 5);
    }

    public function test_invalid_5v5_formation_with_six_starters(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $players = Player::factory()->count(6)->create(['team_id' => $team->id]);

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('5v5', [
                'players' => array_map(
                    fn ($p) => $this->starterPayload($p, ['tactical_position' => 'CM', 'x' => 0.5, 'y' => 0.5]),
                    $players->all(),
                ),
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['players']);
    }

    public function test_valid_7v7_formation_with_seven_starters(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $players = Player::factory()->count(7)->create(['team_id' => $team->id]);

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('7v7', [
                'players' => array_map(
                    fn ($p) => $this->starterPayload($p, ['tactical_position' => 'CM', 'x' => 0.5, 'y' => 0.5]),
                    $players->all(),
                ),
            ]))
            ->assertStatus(201)
            ->assertJsonPath('data.starters_count', 7);
    }

    public function test_invalid_7v7_formation_with_eight_starters(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $players = Player::factory()->count(8)->create(['team_id' => $team->id]);

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('7v7', [
                'players' => array_map(
                    fn ($p) => $this->starterPayload($p, ['tactical_position' => 'CM', 'x' => 0.5, 'y' => 0.5]),
                    $players->all(),
                ),
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['players']);
    }

    public function test_non_team_player_is_rejected(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $outsider = $this->teamPlayer(Team::factory()->create());

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('5v5', [
                'players' => [$this->starterPayload($outsider)],
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['players']);

        $this->assertDatabaseCount('team_formations', 0);
    }

    public function test_duplicate_player_is_rejected(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $player = $this->teamPlayer($team);

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('5v5', [
                'players' => [
                    $this->starterPayload($player),
                    ['player_id' => $player->id, 'is_starter' => false],
                ],
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['players.0.player_id', 'players.1.player_id']);
    }

    public function test_invalid_coordinates_are_rejected(): void
    {
        [$manager, $team] = $this->managerWithTeam();

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('5v5', [
                'players' => [$this->starterPayload($this->teamPlayer($team), ['x' => 1.5])],
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['players.0.x']);
    }

    public function test_invalid_tactical_position_is_rejected(): void
    {
        [$manager, $team] = $this->managerWithTeam();

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('5v5', [
                'players' => [$this->starterPayload($this->teamPlayer($team), ['tactical_position' => 'GOAT'])],
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['players.0.tactical_position']);
    }

    public function test_unauthorized_manager_is_rejected(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $formation = TeamFormation::create(['team_id' => $team->id, 'name' => 'محمية', 'format' => '5v5']);

        [$otherManager, $otherTeam] = $this->managerWithTeam();
        $otherPlayer = $this->teamPlayer($otherTeam);

        $this->actingAs($otherManager)
            ->getJson("/api/manager/team/formations/{$formation->id}")
            ->assertStatus(404);

        $this->actingAs($otherManager)
            ->putJson("/api/manager/team/formations/{$formation->id}", $this->formationPayload('5v5', [
                'players' => [$this->starterPayload($otherPlayer)],
            ]))
            ->assertStatus(404);

        $this->actingAs($otherManager)
            ->deleteJson("/api/manager/team/formations/{$formation->id}")
            ->assertStatus(404);

        $this->assertSame('محمية', $formation->refresh()->name);
    }

    public function test_invalid_format_is_rejected(): void
    {
        [$manager] = $this->managerWithTeam();

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('6v6'))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['format']);
    }

    public function test_lists_formations_with_presets_catalog(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        TeamFormation::create(['team_id' => $team->id, 'name' => 'أ', 'format' => '5v5', 'is_active' => true]);
        TeamFormation::create(['team_id' => $team->id, 'name' => 'ب', 'format' => '7v7']);

        $this->actingAs($manager)->getJson('/api/manager/team/formations')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->actingAs($manager)->getJson('/api/manager/team/formation-presets')
            ->assertOk()
            ->assertJsonPath('data.5v5.0.label', '2-2')
            ->assertJsonPath('data.7v7.0.label', '3-2-1')
            ->assertJsonPath('data.11v11.0.label', '4-3-3');
    }

    public function test_preset_key_must_match_selected_format(): void
    {
        [$manager] = $this->managerWithTeam();

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('7v7', ['preset_key' => '5v5_2_2']))
            ->assertStatus(422);
    }

    public function test_captain_must_be_team_member(): void
    {
        [$manager] = $this->managerWithTeam();
        $outsider = $this->teamPlayer(Team::factory()->create());

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('5v5', ['captain_id' => $outsider->id]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['captain_id']);
    }

    public function test_setting_formation_active_deactivates_the_previous_one(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $first = TeamFormation::create(['team_id' => $team->id, 'name' => 'أولى', 'format' => '5v5', 'is_active' => true]);

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('7v7', ['name' => 'ثانية', 'is_active' => true]))
            ->assertStatus(201);

        $this->assertFalse($first->refresh()->is_active);
        $this->assertTrue(TeamFormation::where('name', 'ثانية')->first()->is_active);
    }

    public function test_formation_does_not_overwrite_player_permanent_position(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $player = $this->teamPlayer($team, ['position' => 'forward', 'preferred_position' => 'forward']);

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('5v5', [
                'players' => [$this->starterPayload($player, ['tactical_position' => 'GK', 'role' => 'goalkeeper'])],
            ]))
            ->assertStatus(201);

        $player->refresh();
        $this->assertSame('forward', $player->position);
        $this->assertSame('forward', $player->preferred_position);
    }

    public function test_captain_and_set_piece_holders_must_be_team_members(): void
    {
        [$manager] = $this->managerWithTeam();
        $outsider = $this->teamPlayer(Team::factory()->create());

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('5v5', [
                'free_kick_taker_id' => $outsider->id,
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['free_kick_taker_id']);

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('5v5', [
                'penalty_taker_id' => $outsider->id,
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['penalty_taker_id']);

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('5v5', [
                'corner_taker_id' => $outsider->id,
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['corner_taker_id']);
    }

    public function test_role_holder_not_in_starting_xi_is_auto_cleared(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $captain = $this->teamPlayer($team);

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('5v5', [
                'preset_key' => '5v5_2_2',
                'captain_id' => $captain->id,
                'penalty_taker_id' => $captain->id,
                'players' => [
                    ['player_id' => $this->teamPlayer($team)->id, 'is_starter' => false],
                ],
            ]))
            ->assertStatus(201);

        $formation = TeamFormation::first();
        $this->assertNull($formation->captain_id);
        $this->assertNull($formation->penalty_taker_id);
    }

    public function test_captain_in_same_starting_xi_is_persisted_with_set_pieces(): void
    {
        [$manager, $team] = $this->managerWithTeam();
        $members = Player::factory()->count(3)->create(['team_id' => $team->id]);

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('5v5', [
                'preset_key' => '5v5_2_2',
                'captain_id' => $members[0]->id,
                'free_kick_taker_id' => $members[1]->id,
                'penalty_taker_id' => $members[2]->id,
                'corner_taker_id' => $members[0]->id,
                'players' => array_map(
                    fn (Player $p, int $i) => $this->starterPayload($p, ['tactical_position' => 'CM', 'x' => 0.5, 'y' => 0.5, 'sort_order' => $i]),
                    $members->all(),
                    array_keys($members->all()),
                ),
            ]))
            ->assertStatus(201)
            ->assertJsonPath('data.captain_id', $members[0]->id)
            ->assertJsonPath('data.free_kick_taker_id', $members[1]->id)
            ->assertJsonPath('data.penalty_taker_id', $members[2]->id)
            ->assertJsonPath('data.corner_taker_id', $members[0]->id);
    }

    // ── Custom preset management ──────────────────────────────

    private function presetSlots(int $count = 5): array
    {
        $positions = ['GK', 'CB', 'CB', 'ST', 'ST'];
        $slots = [];

        foreach (array_slice($positions, 0, $count) as $index => $position) {
            $slots[] = ['tactical_position' => $position, 'x' => 0.2 + $index * 0.15, 'y' => 0.3];
        }

        return $slots;
    }

    public function test_manager_can_create_rename_and_delete_custom_preset(): void
    {
        [$manager, $team] = $this->managerWithTeam();

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formation-presets', [
                'name' => 'خطة الدفاع',
                'format' => '5v5',
                'slots' => $this->presetSlots(5),
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.custom', true)
            ->assertJsonPath('data.key', 'custom:1');

        $this->assertDatabaseCount('formation_presets', 1);

        $this->actingAs($manager)
            ->putJson('/api/manager/team/formation-presets/1', ['name' => 'خطة الدفاع المحكمة'])
            ->assertOk()
            ->assertJsonPath('data.label', 'خطة الدفاع المحكمة');

        $this->actingAs($manager)
            ->getJson('/api/manager/team/formation-presets')
            ->assertOk()
            ->assertJsonPath('data.5v5.4.custom', true)
            ->assertJsonPath('data.5v5.4.key', 'custom:1');

        $this->actingAs($manager)
            ->deleteJson('/api/manager/team/formation-presets/1')
            ->assertOk();

        $this->assertDatabaseCount('formation_presets', 0);
    }

    public function test_custom_preset_requires_full_slot_set_for_format(): void
    {
        [$manager] = $this->managerWithTeam();

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formation-presets', [
                'name' => 'ناقصة',
                'format' => '5v5',
                'slots' => $this->presetSlots(3),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['slots']);
    }

    public function test_formation_accepts_own_custom_preset_key(): void
    {
        [$manager, $team] = $this->managerWithTeam();

        $preset = FormationPreset::create([
            'team_id' => $team->id,
            'name' => 'خطة مخصصة',
            'format' => '5v5',
            'slots' => [['GK', 0.5, 0.1], ['CB', 0.3, 0.35], ['CB', 0.7, 0.35], ['ST', 0.3, 0.75], ['ST', 0.7, 0.75]],
        ]);

        $members = Player::factory()->count(5)->create(['team_id' => $team->id]);

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('5v5', [
                'preset_key' => 'custom:'.$preset->id,
                'players' => array_map(
                    fn (Player $p, int $i) => $this->starterPayload($p, ['tactical_position' => 'CM', 'x' => 0.5, 'y' => 0.5, 'sort_order' => $i]),
                    $members->all(),
                    array_keys($members->all()),
                ),
            ]))
            ->assertStatus(201)
            ->assertJsonPath('data.preset_key', 'custom:'.$preset->id);
    }

    public function test_formation_rejects_foreign_custom_preset_key(): void
    {
        [$manager] = $this->managerWithTeam();
        [$otherManager, $otherTeam] = $this->managerWithTeam();

        $foreignPreset = FormationPreset::create([
            'team_id' => $otherTeam->id,
            'name' => 'خطة الآخرين',
            'format' => '5v5',
            'slots' => [['GK', 0.5, 0.1], ['CB', 0.3, 0.35], ['CB', 0.7, 0.35], ['ST', 0.3, 0.75], ['ST', 0.7, 0.75]],
        ]);

        $this->actingAs($manager)
            ->postJson('/api/manager/team/formations', $this->formationPayload('5v5', [
                'preset_key' => 'custom:'.$foreignPreset->id,
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['preset_key']);
    }
}
