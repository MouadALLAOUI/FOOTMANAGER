<?php

namespace Tests\Feature\Committee;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Competition\Models\Round;
use App\Domains\Match\Enums\MatchEventType;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\MatchEvent;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TournamentWorkflowTest extends TestCase
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
            'name' => 'بطولة رمضان '.uniqid(),
            'edition' => '8',
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

        $this->assertNotEmpty($matchdays);

        foreach ($matchdays as $matchday) {
            $fixtures = Fixture::query()
                ->where('competition_id', $tournament->competition_id)
                ->whereNotNull('group_id')
                ->where('matchday', $matchday)
                ->orderBy('id')
                ->get();

            $this->assertNotEmpty($fixtures);

            foreach ($fixtures as $fixture) {
                $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
                    'home_score' => 1,
                    'away_score' => 0,
                ])->assertOk();
            }
        }
    }

    public function test_store_builds_competition_structure(): void
    {
        $tournament = $this->createTournament();

        $this->assertNotNull($tournament->competition_id);
        $this->assertNotNull($tournament->season_id);
        $this->assertEquals('cup', $tournament->competition->type->value);
        $this->assertDatabaseCount('seasons', 1);
        $this->assertCount(2, $tournament->competition->groups);

        $stages = $tournament->competition->rounds->map(fn (Round $round) => $round->stage?->value)->all();

        $this->assertEquals(['group'], $stages);
    }

    public function test_knockout_rounds_created_after_group_stage_completes(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures")->assertCreated();

        $stages = $tournament->fresh()->competition->rounds->map(fn (Round $round) => $round->stage?->value)->all();

        $this->assertEquals(['group'], $stages);

        $this->completeGroupStage($tournament);

        $stages = $tournament->fresh()->competition->rounds
            ->sortBy('order_index')
            ->map(fn (Round $round) => $round->stage?->value)
            ->values()
            ->all();

        $this->assertEquals(['group', 'semifinal', 'final'], $stages);
    }

    public function test_qualify_per_group_drives_knockout_size(): void
    {
        $tournament = $this->createTournament([
            'qualify_per_group' => 3,
            'knockout_teams' => 8,
        ]);
        $this->addTeamsAndDraw($tournament, 8);
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures")->assertCreated();

        $this->completeGroupStage($tournament);

        $this->assertSame(6, $tournament->fresh()->knockout_teams);

        $stages = $tournament->fresh()->competition->rounds
            ->sortBy('order_index')
            ->map(fn (Round $round) => $round->stage?->value)
            ->values()
            ->all();

        $this->assertEquals(['group', 'semifinal', 'final'], $stages);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/bracket/populate")->assertOk();
    }

    public function test_teams_can_be_added_and_draw_distributes_evenly(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);

        $this->assertDatabaseCount('tournament_teams', 8);
        $this->assertDatabaseMissing('tournament_teams', ['group_id' => null]);
        $this->assertNotNull($tournament->fresh()->draw_confirmed_at);

        $groups = $tournament->competition->groups;
        $this->assertSame(4, $tournament->tournamentTeams()->where('group_id', $groups[0]->id)->count());
        $this->assertSame(4, $tournament->tournamentTeams()->where('group_id', $groups[1]->id)->count());
    }

    public function test_manual_assign_moves_team_between_groups_and_pool(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);

        $this->deleteJson("/api/committee/tournaments/{$tournament->id}/draw/confirm")->assertOk();

        $draw = $this->getJson("/api/committee/tournaments/{$tournament->id}/draw")->assertOk()->json('data');
        $this->assertCount(2, $draw);
        $groupA = $draw[0]['group_id'];
        $groupB = $draw[1]['group_id'];

        $teamA = $tournament->tournamentTeams()->where('group_id', $groupA)->orderBy('id')->first();
        $this->assertNotNull($teamA);
        $teamB = $tournament->tournamentTeams()->where('group_id', $groupB)->orderBy('id')->first();
        $this->assertNotNull($teamB);

        // free a slot in group B, then move teamA into it at position 1
        $this->putJson("/api/committee/tournaments/{$tournament->id}/draw/team", [
            'team_id' => $teamB->team_id,
            'group_id' => null,
        ])->assertOk();

        $this->putJson("/api/committee/tournaments/{$tournament->id}/draw/team", [
            'team_id' => $teamA->team_id,
            'group_id' => $groupB,
            'group_position' => 1,
        ])->assertOk();

        $this->assertDatabaseHas('tournament_teams', [
            'tournament_id' => $tournament->id,
            'team_id' => $teamA->team_id,
            'group_id' => $groupB,
            'group_position' => 1,
        ]);

        $groupBPositions = $tournament->tournamentTeams()
            ->where('group_id', $groupB)
            ->orderBy('group_position')
            ->pluck('group_position')
            ->all();

        $this->assertSame([1, 2, 3, 4], $groupBPositions);

        $this->putJson("/api/committee/tournaments/{$tournament->id}/draw/team", [
            'team_id' => $teamA->team_id,
            'group_id' => null,
        ])->assertOk();

        $this->assertDatabaseHas('tournament_teams', [
            'tournament_id' => $tournament->id,
            'team_id' => $teamA->team_id,
            'group_id' => null,
            'group_position' => null,
        ]);

        $groupBPositions = $tournament->tournamentTeams()
            ->where('group_id', $groupB)
            ->orderBy('group_position')
            ->pluck('group_position')
            ->all();

        $this->assertSame([1, 2, 3], $groupBPositions);
    }

    public function test_manual_assign_rejects_full_group_and_unknown_team(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);

        $this->deleteJson("/api/committee/tournaments/{$tournament->id}/draw/confirm")->assertOk();

        $draw = $this->getJson("/api/committee/tournaments/{$tournament->id}/draw")->assertOk()->json('data');
        $groupB = $draw[1]['group_id'];

        $teamA = $tournament->tournamentTeams()->where('group_id', $draw[0]['group_id'])->orderBy('id')->first();
        $this->assertNotNull($teamA);

        $this->putJson("/api/committee/tournaments/{$tournament->id}/draw/team", [
            'team_id' => $teamA->team_id,
            'group_id' => $groupB,
            'group_position' => 1,
        ])->assertUnprocessable();

        $this->assertDatabaseHas('tournament_teams', [
            'tournament_id' => $tournament->id,
            'team_id' => $teamA->team_id,
            'group_id' => $draw[0]['group_id'],
        ]);

        $this->putJson("/api/committee/tournaments/{$tournament->id}/draw/team", [
            'team_id' => 99999,
            'group_id' => $groupB,
        ])->assertUnprocessable();
    }

    public function test_bulk_save_persists_whole_board(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);

        $this->deleteJson("/api/committee/tournaments/{$tournament->id}/draw/confirm")->assertOk();

        $pivots = $tournament->tournamentTeams()->orderBy('id')->get();
        $first = $pivots->first();
        $groupA = $first->group_id;

        $assignments = $pivots->map(fn ($p) => $p->id === $first->id
            ? ['team_id' => $p->team_id, 'group_id' => null, 'group_position' => null]
            : ['team_id' => $p->team_id, 'group_id' => $p->group_id, 'group_position' => $p->group_position]
        )->values()->all();

        $this->putJson("/api/committee/tournaments/{$tournament->id}/draw/teams", ['teams' => $assignments])
            ->assertOk();

        $this->assertDatabaseHas('tournament_teams', [
            'tournament_id' => $tournament->id,
            'team_id' => $first->team_id,
            'group_id' => null,
            'group_position' => null,
        ]);

        $groupAPositions = $tournament->tournamentTeams()
            ->where('group_id', $groupA)
            ->orderBy('group_position')
            ->pluck('group_position')
            ->all();

        $this->assertSame([1, 2, 3], $groupAPositions);
    }

    public function test_bulk_save_rejects_overfilled_group(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);

        $this->deleteJson("/api/committee/tournaments/{$tournament->id}/draw/confirm")->assertOk();

        $pivots = $tournament->tournamentTeams()->orderBy('id')->get();
        $groupB = $pivots->last()->group_id;

        $assignments = $pivots->map(fn ($p) => [
            'team_id' => $p->team_id,
            'group_id' => $groupB,
            'group_position' => 1,
        ])->values()->all();

        $this->putJson("/api/committee/tournaments/{$tournament->id}/draw/teams", ['teams' => $assignments])
            ->assertUnprocessable();
    }

    public function test_fixture_generation_creates_round_robin_matches(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", [
            'starts_on' => '2026-09-01',
            'default_time' => '20:00',
        ])->assertCreated()
            ->assertJsonPath('data.generated', 12)
            ->assertJsonPath('message', 'تم إنشاء 12 مباراة في دور المجموعات');

        $this->assertDatabaseCount('fixtures', 12);
        $this->assertDatabaseCount('matches', 12);

        $this->getJson("/api/committee/tournaments/{$tournament->id}/fixtures")
            ->assertOk()
            ->assertJsonCount(12, 'data');
    }

    public function test_regenerate_fixtures_replaces_them(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures")->assertCreated();
        $this->assertDatabaseCount('fixtures', 12);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", ['regenerate' => true])
            ->assertCreated()
            ->assertJsonPath('data.generated', 12);

        $this->assertDatabaseCount('fixtures', 12);
        $this->assertDatabaseCount('matches', 12);
    }

    public function test_result_enters_score_and_updates_standings_with_custom_points(): void
    {
        $tournament = $this->createTournament(['points_for_win' => 4, 'points_for_draw' => 2]);
        $this->addTeamsAndDraw($tournament, 8);
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures")->assertCreated();

        $fixture = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->orderBy('id')
            ->first();

        $home = $fixture->home_team_id;
        $away = $fixture->away_team_id;

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 2,
            'away_score' => 1,
            'scorers' => [
                ['team_id' => $home, 'minute' => 10],
                ['team_id' => $home, 'minute' => 55],
                ['team_id' => $away, 'minute' => 80],
            ],
        ])->assertOk();

        $match = $fixture->fresh()->match;

        $this->assertNotNull($match);
        $this->assertEquals(MatchStatus::Finished, $match->status);
        $this->assertEquals($home, $match->winner_team_id);
        $this->assertEquals(3, MatchEvent::query()->where('match_id', $match->id)->where('type', MatchEventType::Goal->value)->count());

        $standings = $this->getJson("/api/committee/tournaments/{$tournament->id}/standings")
            ->assertOk()
            ->json('data');

        $this->assertCount(2, $standings['groups']);

        $rows = collect($standings['groups'])->flatMap(fn ($group) => $group['rows']);
        $homeRow = $rows->firstWhere('team_id', $home);
        $awayRow = $rows->firstWhere('team_id', $away);

        $this->assertSame(4, $homeRow['points']);
        $this->assertSame(0, $awayRow['points']);
        $this->assertSame(2, $homeRow['goals_for']);
    }

    public function test_undo_result_is_blocked_after_entering(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures")->assertCreated();

        $fixture = Fixture::query()->where('competition_id', $tournament->competition_id)->orderBy('id')->first();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 3,
            'away_score' => 0,
        ])->assertOk();

        $this->deleteJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result")
            ->assertUnprocessable();

        $match = $fixture->fresh()->match;
        $this->assertEquals(MatchStatus::Finished, $match->status);
        $this->assertSame(3, $match->home_score);
    }

    public function test_result_cannot_be_entered_twice(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures")->assertCreated();

        $fixture = Fixture::query()->where('competition_id', $tournament->competition_id)->orderBy('id')->first();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 1,
            'away_score' => 0,
        ])->assertOk();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 2,
            'away_score' => 1,
        ])->assertUnprocessable();

        $match = $fixture->fresh()->match;
        $this->assertSame(1, $match->home_score);
        $this->assertSame(0, $match->away_score);
    }

    public function test_result_requires_previous_matchday_finished(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures")->assertCreated();

        $fixture = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('matchday', 2)
            ->orderBy('id')
            ->firstOrFail();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 1,
            'away_score' => 0,
        ])->assertUnprocessable();
    }

    public function test_postponed_match_does_not_block_next_matchday(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures")->assertCreated();

        $matchday1 = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('matchday', 1)
            ->orderBy('id')
            ->get();

        $this->assertGreaterThan(1, $matchday1->count());

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$matchday1->first()->id}/postpone")->assertOk();

        foreach ($matchday1->slice(1) as $fixture) {
            $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
                'home_score' => 1,
                'away_score' => 0,
            ])->assertOk();
        }

        $fixture = Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('matchday', 2)
            ->orderBy('id')
            ->firstOrFail();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 1,
            'away_score' => 0,
        ])->assertOk();
    }

    public function test_knockout_tie_requires_penalties(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures")->assertCreated();

        $this->completeGroupStage($tournament);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/bracket")->assertOk();
        $this->postJson("/api/committee/tournaments/{$tournament->id}/bracket/populate")->assertOk();

        $semiRound = Round::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('name', 'نصف النهائي')
            ->firstOrFail();

        $semi = Fixture::query()->where('round_id', $semiRound->id)->orderBy('id')->first();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$semi->id}/result", [
            'home_score' => 1,
            'away_score' => 1,
        ])->assertUnprocessable();
    }

    public function test_full_bracket_flow_crowns_champion(): void
    {
        $tournament = $this->createTournament(['knockout_teams' => 4]);
        $this->addTeamsAndDraw($tournament, 8);
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures")->assertCreated();

        $this->completeGroupStage($tournament);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/bracket")
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->postJson("/api/committee/tournaments/{$tournament->id}/bracket/populate")->assertOk();

        $semiRound = Round::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('name', 'نصف النهائي')
            ->firstOrFail();

        $semis = Fixture::query()->where('round_id', $semiRound->id)->orderBy('id')->get();

        $this->assertCount(2, $semis);

        foreach ($semis as $semi) {
            $this->assertNotNull($semi->home_team_id);
            $this->assertNotNull($semi->away_team_id);
        }

        $semiOne = $semis->get(0);
        $semiTwo = $semis->get(1);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$semiOne->id}/result", [
            'home_score' => 2,
            'away_score' => 0,
        ])->assertOk();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$semiTwo->id}/result", [
            'home_score' => 1,
            'away_score' => 1,
            'home_penalties' => 4,
            'away_penalties' => 3,
        ])->assertOk();

        $finalRound = Round::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('name', 'النهائي')
            ->firstOrFail();

        $final = Fixture::query()->where('round_id', $finalRound->id)->firstOrFail();

        $this->assertNotNull($final->home_team_id);
        $this->assertNotNull($final->away_team_id);
        $this->assertEquals($semiOne->match->winner_team_id, $final->home_team_id);
        $this->assertEquals($semiTwo->match->winner_team_id, $final->away_team_id);

        $champion = $final->home_team_id;

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$final->id}/result", [
            'home_score' => 3,
            'away_score' => 1,
        ])->assertOk();

        $tournament->refresh();

        $this->assertEquals('completed', $tournament->status);
        $this->assertSame($champion, $tournament->plan['champion_team_id']);

        $stats = $this->getJson("/api/committee/tournaments/{$tournament->id}/statistics")
            ->assertOk()
            ->json('data');

        $this->assertSame($champion, $stats['champion_team_id']);
        $this->assertSame(15, $stats['summary']['matches_played']);
    }

    public function test_other_committee_cannot_manage_tournament(): void
    {
        $tournament = $this->createTournament();

        $other = User::factory()->committee()->approved()->create();
        Sanctum::actingAs($other);

        $this->getJson("/api/committee/tournaments/{$tournament->id}")->assertForbidden();
        $this->postJson("/api/committee/tournaments/{$tournament->id}/draw")->assertForbidden();
        $this->postJson("/api/committee/tournaments/{$tournament->id}/open-registration")->assertForbidden();
    }

    public function test_non_committee_cannot_use_committee_endpoints(): void
    {
        $tournament = $this->createTournament();

        $manager = User::factory()->approved()->create(['role' => 'manager']);
        Sanctum::actingAs($manager);

        $this->getJson("/api/committee/tournaments/{$tournament->id}")->assertForbidden();
    }

    public function test_public_endpoints_only_expose_published_tournaments(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament, 8);

        $this->getJson("/api/v1/tournaments/{$tournament->id}")->assertNotFound();
        $this->getJson("/api/v1/tournaments/{$tournament->id}/fixtures")->assertNotFound();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/open-registration")->assertOk();

        $this->getJson("/api/v1/tournaments/{$tournament->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'open_for_registration');

        $this->getJson('/api/v1/tournaments')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson("/api/v1/tournaments/{$tournament->id}/fixtures")->assertOk();
        $this->getJson("/api/v1/tournaments/{$tournament->id}/draw")->assertOk();
        $this->getJson("/api/v1/tournaments/{$tournament->id}/standings")->assertOk();
    }
}
