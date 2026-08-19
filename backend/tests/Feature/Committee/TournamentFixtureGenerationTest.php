<?php

namespace Tests\Feature\Committee;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Competition\Models\Group;
use App\Domains\Competition\Models\Round;
use App\Domains\Match\Models\MatchRequest;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TournamentFixtureGenerationTest extends TestCase
{
    use RefreshDatabase;

    private User $committee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->committee = User::factory()->committee()->approved()->create();
        Sanctum::actingAs($this->committee);
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
            'name' => 'بطولة الصيف '.uniqid(),
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
        ], $overrides);

        $response = $this->postJson('/api/committee/tournaments', $payload)->assertCreated();

        return Tournament::findOrFail($response->json('data.id'));
    }

    private function addTeamsAndDraw(Tournament $tournament, int $count = 8): void
    {
        $teamIds = $this->makeTeams($count);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams", ['team_ids' => $teamIds])
            ->assertOk()
            ->assertJsonCount($count, 'data');

        $this->postJson("/api/committee/tournaments/{$tournament->id}/draw")
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    private function completeGroupStage(Tournament $tournament): void
    {
        $matchdays = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->whereNotNull('group_id')
            ->distinct()
            ->orderBy('matchday')
            ->pluck('matchday');

        foreach ($matchdays as $matchday) {
            $fixtures = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->whereNotNull('group_id')
                ->where('matchday', $matchday)
                ->orderBy('id')
                ->get();

            foreach ($fixtures as $fixture) {
                $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
                    'home_score' => 1,
                    'away_score' => 0,
                ])->assertOk();
            }
        }
    }

    private function firstGroupTeamId(Tournament $tournament): int
    {
        $group = Group::query()
            ->where('competition_id', $tournament->competition_id)
            ->orderBy('name')
            ->firstOrFail();

        return (int) TournamentTeam::query()
            ->where('tournament_id', $tournament->id)
            ->where('status', TournamentTeam::STATUS_REGISTERED)
            ->where('group_id', $group->id)
            ->orderBy('id')
            ->value('team_id');
    }

    private function createAmicalConflict(Tournament $tournament, string $datetime = '2026-09-01 20:00:00'): int
    {
        $teamId = $this->firstGroupTeamId($tournament);

        return MatchRequest::factory()->create([
            'host_team_id' => $teamId,
            'opponent_team_id' => null,
            'match_datetime' => $datetime,
            'status' => 'accepted',
        ])->id;
    }

    public function test_group_preview_returns_plan_without_persisting(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/preview", [
            'stage' => 'group',
            'starts_on' => '2026-09-01',
            'default_time' => '20:00',
        ])->assertOk()
            ->assertJsonPath('data.matches.11.matchday', 3)
            ->assertJsonPath('data.conflicts', 0)
            ->assertJsonPath('data.skipped', 0);

        $this->assertDatabaseCount('fixtures', 0);
        $this->assertDatabaseCount('matches', 0);
    }

    public function test_group_generation_creates_unique_round_robin_fixtures(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", [
            'starts_on' => '2026-09-01',
            'default_time' => '20:00',
        ])->assertCreated()
            ->assertJsonPath('data.generated', 12);

        $this->assertDatabaseCount('fixtures', 12);
        $this->assertDatabaseCount('matches', 12);

        $pairs = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->whereNotNull('group_id')
            ->get(['home_team_id', 'away_team_id'])
            ->map(fn (Fixture $f) => [$f->home_team_id, $f->away_team_id])
            ->all();

        $unique = array_unique(array_map(fn (array $p) => implode(':', $p), $pairs));

        $this->assertCount(12, $unique);
        $this->assertCount(12, $pairs);
    }

    public function test_non_tournament_stadium_is_rejected(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);

        $stadium = Stadium::factory()->create(['supports_tournaments' => false]);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", [
            'stadium_ids' => [$stadium->id],
        ])->assertUnprocessable()
            ->assertJsonFragment(['message' => "ملعب «{$stadium->name}» لا يدعم البطولات"]);

        $this->assertDatabaseCount('fixtures', 0);
    }

    public function test_closed_or_unavailable_stadium_is_rejected(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);

        $closed = Stadium::factory()->create(['supports_tournaments' => true, 'is_open' => false]);
        $unavailable = Stadium::factory()->create(['supports_tournaments' => true, 'is_open' => true, 'is_available' => false]);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", [
            'stadium_ids' => [$closed->id],
        ])->assertUnprocessable()
            ->assertJsonFragment(['message' => "ملعب «{$closed->name}» مغلق حالياً"]);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", [
            'stadium_ids' => [$unavailable->id],
        ])->assertUnprocessable()
            ->assertJsonFragment(['message' => "ملعب «{$unavailable->name}» غير متاح حالياً"]);

        $this->assertDatabaseCount('fixtures', 0);
    }

    public function test_conflict_aborts_generation_and_rolls_back(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);
        $this->createAmicalConflict($tournament);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", [
            'starts_on' => '2026-09-01',
            'default_time' => '20:00',
        ])->assertUnprocessable()
            ->assertJsonFragment(['message' => 'تعذر إنشاء البرنامج بسبب تعارض واحد: الفريق المضيف لديه مباراة أخرى في هذا التوقيت']);

        $this->assertDatabaseCount('fixtures', 0);
        $this->assertDatabaseCount('matches', 0);
    }

    public function test_auto_roll_moves_conflicted_match_to_next_free_slot(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);
        $this->createAmicalConflict($tournament);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", [
            'starts_on' => '2026-09-01',
            'default_time' => '20:00',
            'conflict_strategy' => 'auto_roll',
        ])->assertCreated()
            ->assertJsonPath('data.generated', 12)
            ->assertJsonPath('data.conflicts', 0);

        $this->assertDatabaseCount('fixtures', 12);

        $scheduled = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->whereNotNull('group_id')
            ->pluck('scheduled_at')
            ->map(fn ($date) => $date->format('Y-m-d H:i'))
            ->all();

        $this->assertContains('2026-09-01 22:00', $scheduled);
    }

    public function test_skip_drops_conflicted_matches_for_later_editing(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);
        $this->createAmicalConflict($tournament);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", [
            'starts_on' => '2026-09-01',
            'default_time' => '20:00',
            'conflict_strategy' => 'skip',
        ])->assertCreated()
            ->assertJsonPath('data.generated', 11)
            ->assertJsonPath('data.skipped', 1);

        $this->assertDatabaseCount('fixtures', 11);
    }

    public function test_knockout_qualified_derives_teams_from_standings(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures")->assertCreated();
        $this->completeGroupStage($tournament);

        $this->getJson("/api/committee/tournaments/{$tournament->id}/fixtures/knockout-qualified")
            ->assertOk()
            ->assertJsonPath('data.expected', 4)
            ->assertJsonPath('data.count', 4);
    }

    public function test_knockout_fixtures_are_created_after_group_stage(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures")->assertCreated();
        $this->completeGroupStage($tournament);

        $qualified = $this->getJson("/api/committee/tournaments/{$tournament->id}/fixtures/knockout-qualified")
            ->assertOk()
            ->json('data');

        $teamIds = collect($qualified['teams'])->pluck('team_id')->all();

        $this->assertCount(4, $teamIds);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/preview", [
            'stage' => 'knockout',
            'starts_on' => '2026-09-06',
            'team_ids' => $teamIds,
        ])->assertOk()
            ->assertJsonPath('data.matches.0.home_team_name', $qualified['teams'][0]['name'])
            ->assertJsonPath('data.matches.0.away_team_name', $qualified['teams'][3]['name'])
            ->assertJsonPath('data.conflicts', 0);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", [
            'stage' => 'knockout',
            'starts_on' => '2026-09-06',
            'team_ids' => $teamIds,
        ])->assertCreated()
            ->assertJsonPath('data.generated', 2)
            ->assertJsonPath('message', 'تم إنشاء 2 مباراة في الأدوار الإقصائية');

        $this->assertDatabaseCount('fixtures', 15);
        $this->assertDatabaseCount('matches', 14);

        $knockoutFixtures = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->whereHas('round', fn ($q) => $q->where('stage', '!=', 'group'))
            ->get();

        $scheduled = $knockoutFixtures->filter(fn (Fixture $f) => $f->scheduled_at !== null);

        $this->assertCount(2, $scheduled);

        foreach ($scheduled as $fixture) {
            $this->assertNotNull($fixture->home_team_id);
            $this->assertNotNull($fixture->away_team_id);
        }
    }

    public function test_knockout_rejects_wrong_team_count(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures")->assertCreated();
        $this->completeGroupStage($tournament);

        $qualified = $this->getJson("/api/committee/tournaments/{$tournament->id}/fixtures/knockout-qualified")->json('data');
        $teamIds = collect($qualified['teams'])->pluck('team_id')->take(3)->all();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", [
            'stage' => 'knockout',
            'team_ids' => $teamIds,
        ])->assertUnprocessable()
            ->assertJsonFragment(['message' => 'عدد الفرق المتأهلة يجب أن يكون 4']);

        $this->assertDatabaseCount('fixtures', 12);
    }

    public function test_knockout_rejects_duplicate_teams(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures")->assertCreated();
        $this->completeGroupStage($tournament);

        $qualified = $this->getJson("/api/committee/tournaments/{$tournament->id}/fixtures/knockout-qualified")->json('data');
        $first = (int) $qualified['teams'][0]['team_id'];
        $second = (int) $qualified['teams'][1]['team_id'];

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", [
            'stage' => 'knockout',
            'team_ids' => [$first, $first, $second, $second],
        ])->assertUnprocessable()
            ->assertJsonFragment(['message' => 'لا يمكن تكرار نفس الفريق في القائمة']);
    }
}
