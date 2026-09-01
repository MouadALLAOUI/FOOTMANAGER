<?php

namespace Tests\Feature\Committee;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Player\Models\Player;
use App\Domains\Subscription\Enums\SubscriptionStatus;
use App\Domains\Subscription\Models\Plan;
use App\Domains\Subscription\Models\Subscription;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentSquadMember;
use App\Models\User;
use Database\Seeders\FeatureSeeder;
use Database\Seeders\PlanFeatureSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\StreamsProgress;
use Tests\TestCase;

class TournamentSquadBulkEditTest extends TestCase
{
    use RefreshDatabase;
    use StreamsProgress;

    private User $committee;

    protected function setUp(): void
    {
        parent::setUp();

        // Tournament creation is gated by the subscription quota which needs the plans seeded.
        $this->seed([PlanSeeder::class, FeatureSeeder::class, PlanFeatureSeeder::class]);

        $this->committee = User::factory()->committee()->approved()->create();
        $this->subscribeCommitteeToPlatinum();
        Sanctum::actingAs($this->committee);
    }

    private function subscribeCommitteeToPlatinum(): void
    {
        $plan = Plan::where('slug', 'platinum')->firstOrFail();

        Subscription::create([
            'user_id' => $this->committee->id,
            'plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'starts_at' => now(),
            'ends_at' => now()->addMonth(),
            'price_at_start' => $plan->price,
            'currency' => $plan->currency,
            'billing_interval' => $plan->billing_interval,
        ]);

        $this->committee->unsetRelation('activeSubscription');
        $this->committee->unsetRelation('subscriptions');
    }

    private function makeTeams(int $count = 8): array
    {
        $teamIds = [];

        for ($i = 0; $i < $count; $i++) {
            $teamIds[] = Team::factory()->create()->id;
        }

        return $teamIds;
    }

    private function createTournament(array $overrides = []): Tournament
    {
        $payload = array_merge([
            'name' => 'بطولة قوائم اللاعبين '.uniqid(),
            'edition' => '1',
            'category' => 'أكابر',
            'location' => 'تكامورت',
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
        ], $overrides);

        $response = $this->postJson('/api/committee/tournaments', $payload)->assertCreated();

        return Tournament::findOrFail($response->json('data.id'));
    }

    private function firstFixture(Tournament $tournament): Fixture
    {
        return Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->whereNotNull('group_id')
            ->orderBy('id')
            ->firstOrFail();
    }

    private function setupTournamentWithFreeTeam(): array
    {
        $teamIds = $this->makeTeams(7);

        $tournament = $this->createTournament();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams", ['team_ids' => $teamIds])->assertOk();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/free", [
            'name' => 'فريق حر '.uniqid(),
        ])->assertOk();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/draw")->assertOk();
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures")->assertCreated();

        $freeTeam = Team::query()->where('is_free', true)->latest('id')->firstOrFail();

        return [$tournament, $freeTeam];
    }

    private function fixtureSetup(): array
    {
        $teamIds = $this->makeTeams(8);

        $tournament = $this->createTournament();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams", ['team_ids' => $teamIds])->assertOk();
        $this->postJson("/api/committee/tournaments/{$tournament->id}/draw")->assertOk();
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures")->assertCreated();

        $fixture = $this->firstFixture($tournament);

        return [$tournament, $fixture];
    }

    public function test_bulk_add_creates_all_players_and_links_squad(): void
    {
        $this->section('bulk add: all valid rows are created and linked to the squad');

        [$tournament, $team] = $this->setupTournamentWithFreeTeam();

        $response = $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/{$team->id}/squad/bulk", [
            'players' => [
                ['name' => 'محمد أمين', 'number' => 7],
                ['name' => 'سفيان', 'number' => 11],
                ['name' => 'عبد الرحيم'],
            ],
        ])->assertCreated()->json();

        $this->assertSame(3, $response['created_count']);
        $this->assertSame(3, $response['squad_count']);
        $this->assertCount(3, $response['players']);

        $this->assertSame(3, Player::query()->where('team_id', $team->id)->count());
        $this->assertSame(3, TournamentSquadMember::query()
            ->where('tournament_id', $tournament->id)
            ->where('team_id', $team->id)
            ->count());

        $names = array_column($response['players'], 'name');

        $this->assertContains('محمد أمين', $names);
        $this->assertContains('سفيان', $names);
        $this->assertContains('عبد الرحيم', $names);

        $this->note('three players created, all pre-validated and linked');
    }

    public function test_bulk_add_rejects_duplicate_number_atomically(): void
    {
        $this->section('bulk add: duplicate jersey numbers are rejected with per-row errors and nothing is created');

        [$tournament, $team] = $this->setupTournamentWithFreeTeam();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/{$team->id}/squad/bulk", [
            'players' => [
                ['name' => 'مدافع', 'number' => 5],
                ['name' => 'مهاجم', 'number' => 5],
                ['name' => 'وسط', 'number' => 9],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['players.1.number']);

        $this->assertSame(0, Player::query()->where('team_id', $team->id)->count());
        $this->assertSame(0, TournamentSquadMember::query()
            ->where('tournament_id', $tournament->id)
            ->where('team_id', $team->id)
            ->count());

        $this->note('no players were created when one row reused a number');
    }

    public function test_bulk_add_rejects_duplicate_name_within_batch_and_vs_roster(): void
    {
        $this->section('bulk add: duplicate names are rejected within the batch and against the roster');

        [$tournament, $team] = $this->setupTournamentWithFreeTeam();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/{$team->id}/squad/bulk", [
            'players' => [
                ['name' => 'مختار', 'number' => 4],
                ['name' => 'مختار', 'number' => 8],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['players.1.name']);

        // A previously created roster player also blocks a bulk row reuse.
        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/{$team->id}/squad", [
            'name' => 'عارف',
            'number' => 2,
        ])->assertCreated();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/{$team->id}/squad/bulk", [
            'players' => [
                ['name' => 'عارف', 'number' => 10],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['players.0.name']);

        $this->assertSame(1, Player::query()->where('team_id', $team->id)->count());

        $this->note('duplicate names fail cleanly and leave the roster intact');
    }

    public function test_bulk_add_accepts_zero_and_missing_numbers(): void
    {
        $this->section('bulk add: number 0 and missing numbers are both allowed (no jersey rule)');

        [$tournament, $team] = $this->setupTournamentWithFreeTeam();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/{$team->id}/squad/bulk", [
            'players' => [
                ['name' => 'حارس', 'number' => 0],
                ['name' => 'ظهير', 'number' => 0],
                ['name' => 'متعدد المناصب'],
            ],
        ])->assertCreated();

        $this->assertSame(3, Player::query()->where('team_id', $team->id)->count());

        $numbers = Player::query()->where('team_id', $team->id)->pluck('number');

        $this->assertSame(0, (int) $numbers->first());
        $this->assertNull($numbers[2]);

        $this->note('zero/null jersey numbers never collide');
    }

    public function test_bulk_add_respects_max_players_per_team(): void
    {
        $this->section('bulk add: exceeding the tournament max is rejected before creation');

        [$tournament, $team] = $this->setupTournamentWithFreeTeam();

        $this->putJson("/api/committee/tournaments/{$tournament->id}", [
            'max_players_per_team' => 2,
        ])->assertOk();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/{$team->id}/squad/bulk", [
            'players' => [
                ['name' => 'أ', 'number' => 1],
                ['name' => 'ب', 'number' => 2],
                ['name' => 'ج', 'number' => 3],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['players']);

        $this->assertSame(0, Player::query()->where('team_id', $team->id)->count());

        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/{$team->id}/squad/bulk", [
            'players' => [
                ['name' => 'أ', 'number' => 1],
                ['name' => 'ب', 'number' => 2],
            ],
        ])->assertCreated();

        $this->assertSame(2, Player::query()->where('team_id', $team->id)->count());

        $this->note('three players rejected under a max of two, two accepted');
    }

    public function test_bulk_add_requires_rows_present(): void
    {
        $this->section('bulk add: the players array itself is required and capped');

        [$tournament, $team] = $this->setupTournamentWithFreeTeam();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/{$team->id}/squad/bulk", [
            'players' => [],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['players']);

        $this->note('empty batch rejected by the FormRequest');
    }

    public function test_edit_player_propagates_name_and_number_to_match_events(): void
    {
        $this->section('edit: renamed/renumbered player reflects live in match events');

        [$tournament, $fixture] = $this->fixtureSetup();

        $homeTeam = Team::findOrFail($fixture->home_team_id);

        $player = $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/{$homeTeam->id}/squad/bulk", [
            'players' => [
                ['name' => 'خالد', 'number' => 9],
            ],
        ])->assertCreated()->json('players.0');

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/start")->assertOk();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events", [
            'type' => 'goal',
            'team_id' => $homeTeam->id,
            'player_id' => $player['id'],
            'minute' => 30,
            'half' => 'first',
        ])->assertCreated()
            ->assertJsonPath('data.player.name', 'خالد');

        $this->step('recorded a goal for player خالد before the edit');

        $this->patchJson("/api/committee/tournaments/{$tournament->id}/teams/{$homeTeam->id}/squad/{$player['id']}", [
            'name' => 'جلال',
            'number' => 10,
        ])->assertOk()
            ->assertJsonPath('players.0.name', 'جلال')
            ->assertJsonPath('players.0.number', 10);

        $events = $this->getJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events")
            ->assertOk()
            ->json('data');

        $this->assertCount(1, $events);
        $this->assertSame('جلال', $events[0]['player']['name']);
        $this->assertSame(10, $events[0]['player']['number']);
        $this->assertSame($player['id'], $events[0]['player']['id']);

        $this->assertDatabaseHas('match_events', [
            'player_id' => $player['id'],
            'type' => 'goal',
        ]);

        $this->note('event resource reads the new name/number from the players table');
    }

    public function test_edit_rejects_number_used_by_teammate(): void
    {
        $this->section('edit: a number already used by a teammate is rejected');

        [$tournament, $team] = $this->setupTournamentWithFreeTeam();

        $bulk = $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/{$team->id}/squad/bulk", [
            'players' => [
                ['name' => 'ريبيري', 'number' => 7],
                ['name' => 'هنري', 'number' => 12],
            ],
        ])->assertCreated()->json('players');

        $this->patchJson("/api/committee/tournaments/{$tournament->id}/teams/{$team->id}/squad/{$bulk[0]['id']}", [
            'number' => 12,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['number']);

        $this->assertDatabaseHas('players', [
            'id' => $bulk[0]['id'],
            'name' => 'ريبيري',
            'number' => 7,
        ]);

        $this->note('keeping number 7 untouched while 12 stays with هنري');
    }

    public function test_edit_clears_number_and_does_not_touch_events(): void
    {
        $this->section('edit: number can be cleared to null without touching events');

        [$tournament, $team] = $this->setupTournamentWithFreeTeam();

        $player = $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/{$team->id}/squad/bulk", [
            'players' => [
                ['name' => 'بلا رقم', 'number' => 6],
            ],
        ])->assertCreated()->json('players.0');

        $this->patchJson("/api/committee/tournaments/{$tournament->id}/teams/{$team->id}/squad/{$player['id']}", [
            'number' => null,
        ])->assertOk()
            ->assertJsonPath('players.0.number', null);

        $this->assertDatabaseHas('players', [
            'id' => $player['id'],
            'name' => 'بلا رقم',
            'number' => null,
        ]);

        $this->note('clearing the number only updates the players row');
    }

    public function test_squad_stays_editable_after_tournament_starts(): void
    {
        $this->section('lock: the player list stays editable once the tournament starts');

        [$tournament, $team] = $this->setupTournamentWithFreeTeam();

        $player = $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/{$team->id}/squad/bulk", [
            'players' => [
                ['name' => 'نجم', 'number' => 1],
            ],
        ])->assertCreated()->json('players.0');

        $tournament->forceFill(['status' => Tournament::STATUS_IN_PROGRESS])->save();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/{$team->id}/squad/bulk", [
            'players' => [
                ['name' => 'وافد جديد', 'number' => 2],
            ],
        ])->assertCreated()
            ->assertJsonPath('squad_count', 2);

        $this->patchJson("/api/committee/tournaments/{$tournament->id}/teams/{$team->id}/squad/{$player['id']}", [
            'name' => 'نجم معدل',
        ])->assertOk()
            ->assertJsonPath('players.0.name', 'نجم معدل');

        $this->assertDatabaseHas('players', [
            'id' => $player['id'],
            'name' => 'نجم معدل',
        ]);

        $this->note('adding and renaming players remain available after the tournament starts');
    }
}