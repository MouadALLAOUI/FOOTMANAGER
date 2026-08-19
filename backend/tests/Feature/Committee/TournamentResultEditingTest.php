<?php

namespace Tests\Feature\Committee;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Competition\Models\Round;
use App\Domains\Match\Enums\MatchEventType;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\MatchEvent;
use App\Domains\Match\Models\MatchResultAudit;
use App\Domains\Player\Models\Player;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TournamentResultEditingTest extends TestCase
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
            'name' => 'بطولة النتائج '.uniqid(),
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
            ->assertOk();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/draw")
            ->assertOk();
    }

    private function generateFixtures(Tournament $tournament, array $overrides = []): void
    {
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures", $overrides)
            ->assertCreated();
    }

    private function firstFixture(Tournament $tournament): Fixture
    {
        return Fixture::query()
            ->where('competition_id', $tournament->competition_id)
            ->whereNotNull('group_id')
            ->orderBy('id')
            ->firstOrFail();
    }

    public function test_store_derives_groups_from_teams_count(): void
    {
        $response = $this->postJson('/api/committee/tournaments', [
            'name' => 'بطولة مبسطة '.uniqid(),
            'start_date' => '2026-10-01',
            'tournament_format' => 'groups_knockout',
            'teams_count' => 8,
            'points_for_win' => 3,
            'points_for_draw' => 1,
            'points_for_loss' => 0,
        ])->assertCreated();

        $tournament = Tournament::findOrFail($response->json('data.id'));

        $this->assertSame(2, $tournament->groups_count);
        $this->assertSame(4, $tournament->teams_per_group);
        $this->assertCount(2, $tournament->competition->groups);
    }

    public function test_store_derives_evenly_for_uneven_team_count(): void
    {
        $response = $this->postJson('/api/committee/tournaments', [
            'name' => 'بطولة عشر فرق '.uniqid(),
            'start_date' => '2026-10-01',
            'tournament_format' => 'groups_only',
            'teams_count' => 10,
            'points_for_win' => 3,
            'points_for_draw' => 1,
            'points_for_loss' => 0,
        ])->assertCreated();

        $tournament = Tournament::findOrFail($response->json('data.id'));

        $this->assertSame(3, $tournament->groups_count);
        $this->assertSame(4, $tournament->teams_per_group);
    }

    public function test_store_still_rejects_over_capacity_groups(): void
    {
        $this->postJson('/api/committee/tournaments', [
            'name' => 'بطولة خاطئة '.uniqid(),
            'start_date' => '2026-10-01',
            'tournament_format' => 'groups_knockout',
            'teams_count' => 20,
            'groups_count' => 2,
            'teams_per_group' => 4,
            'points_for_win' => 3,
            'points_for_draw' => 1,
            'points_for_loss' => 0,
        ])->assertUnprocessable();
    }

    public function test_result_detail_exposes_events_statistics_potm_and_audits(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament);
        $this->generateFixtures($tournament);

        $fixture = $this->firstFixture($tournament);
        $home = $fixture->home_team_id;
        $away = $fixture->away_team_id;

        $scorer = Player::factory()->create(['team_id' => $home]);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 2,
            'away_score' => 1,
            'events' => [
                ['type' => 'goal', 'team_id' => $home, 'player_id' => $scorer->id, 'minute' => 10],
                ['type' => 'goal', 'team_id' => $away, 'minute' => 30],
                ['type' => 'goal', 'team_id' => $home, 'player_id' => $scorer->id, 'minute' => 55],
            ],
            'statistics' => [
                ['team_id' => $home, 'possession' => 60, 'shots' => 12],
                ['team_id' => $away, 'possession' => 40, 'shots' => 4],
            ],
            'player_of_the_match' => $scorer->id,
            'notes' => 'مباراة قوية',
        ])->assertOk();

        $detail = $this->getJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result")
            ->assertOk()
            ->json('data');

        $this->assertSame(2, $detail['match']['home_score']);
        $this->assertSame(1, $detail['match']['away_score']);
        $this->assertCount(3, $detail['match']['events']);
        $this->assertSame('مباراة قوية', $detail['match']['notes']);
        $this->assertSame($scorer->id, $detail['match']['player_of_the_match']['player_id']);

        $homeStats = collect($detail['match']['statistics'])->firstWhere('team_id', $home);
        $this->assertSame(60, $homeStats['possession']);
        $this->assertSame(12, $homeStats['shots']);

        $this->assertCount(1, $detail['match']['audits']);
        $this->assertSame('result_created', $detail['match']['audits'][0]['action']);
    }

    public function test_update_result_replaces_events_and_recomputes_score(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament);
        $this->generateFixtures($tournament);

        $fixture = $this->firstFixture($tournament);
        $home = $fixture->home_team_id;
        $away = $fixture->away_team_id;

        $this->putJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'events' => [
                ['type' => 'goal', 'team_id' => $home, 'minute' => 10],
                ['type' => 'own_goal', 'team_id' => $away, 'minute' => 20],
                ['type' => 'goal', 'team_id' => $home, 'minute' => 33],
            ],
        ])->assertOk();

        $match = $fixture->fresh()->match;

        $this->assertSame(3, $match->home_score);
        $this->assertSame(0, $match->away_score);
        $this->assertEquals(MatchStatus::Finished, $match->status);
        $this->assertSame((int) $home, (int) $match->winner_team_id);
        $this->assertSame('played', $fixture->fresh()->status?->value);
    }

    public function test_score_mismatch_with_events_requires_force(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament);
        $this->generateFixtures($tournament);

        $fixture = $this->firstFixture($tournament);
        $home = $fixture->home_team_id;

        $this->putJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 5,
            'away_score' => 0,
            'events' => [
                ['type' => 'goal', 'team_id' => $home, 'minute' => 10],
            ],
        ])->assertUnprocessable();

        $this->putJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 5,
            'away_score' => 0,
            'force' => true,
            'events' => [
                ['type' => 'goal', 'team_id' => $home, 'minute' => 10],
            ],
        ])->assertOk();

        $match = $fixture->fresh()->match;
        $this->assertSame(5, $match->home_score);
        $this->assertSame(0, $match->away_score);
    }

    public function test_event_crud_recomputes_score_and_audits(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament);
        $this->generateFixtures($tournament);

        $fixture = $this->firstFixture($tournament);
        $home = $fixture->home_team_id;
        $away = $fixture->away_team_id;

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 1,
            'away_score' => 0,
            'scorers' => [
                ['team_id' => $home, 'minute' => 10],
            ],
        ])->assertOk();

        $event = $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events", [
            'type' => 'goal',
            'team_id' => $away,
            'minute' => 44,
        ])->assertCreated()
            ->json('data');

        $match = $fixture->fresh()->match;
        $this->assertSame(1, $match->home_score);
        $this->assertSame(1, $match->away_score);

        $this->putJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events/{$event['id']}", [
            'team_id' => $home,
        ])->assertOk();

        $match = $fixture->fresh()->match;
        $this->assertSame(2, $match->home_score);
        $this->assertSame(0, $match->away_score);

        $this->deleteJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events/{$event['id']}")
            ->assertOk();

        $match = $fixture->fresh()->match;
        $this->assertSame(1, $match->home_score);
        $this->assertSame(0, $match->away_score);

        $auditActions = MatchResultAudit::query()->where('match_id', $match->id)->pluck('action')->all();
        $this->assertContains('event_added', $auditActions);
        $this->assertContains('event_updated', $auditActions);
        $this->assertContains('event_deleted', $auditActions);
    }

    public function test_event_rejects_player_not_belonging_to_team(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament);
        $this->generateFixtures($tournament);

        $fixture = $this->firstFixture($tournament);
        $home = $fixture->home_team_id;

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 0,
            'away_score' => 0,
        ])->assertOk();

        $outsider = Player::factory()->create();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events", [
            'type' => 'goal',
            'team_id' => $home,
            'player_id' => $outsider->id,
            'minute' => 10,
        ])->assertUnprocessable();
    }

    public function test_red_carded_player_cannot_receive_later_events(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament);
        $this->generateFixtures($tournament);

        $fixture = $this->firstFixture($tournament);
        $home = $fixture->home_team_id;

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 0,
            'away_score' => 0,
        ])->assertOk();

        $player = Player::factory()->create(['team_id' => $home]);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events", [
            'type' => 'red_card',
            'team_id' => $home,
            'player_id' => $player->id,
            'minute' => 30,
        ])->assertCreated();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events", [
            'type' => 'goal',
            'team_id' => $home,
            'player_id' => $player->id,
            'minute' => 40,
        ])->assertUnprocessable();

        $this->assertSame(0, MatchEvent::query()
            ->where('match_id', $fixture->fresh()->match_id)
            ->where('type', MatchEventType::Goal->value)
            ->count());
    }

    public function test_second_yellow_event_is_recorded_without_affecting_score(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament);
        $this->generateFixtures($tournament);

        $fixture = $this->firstFixture($tournament);
        $home = $fixture->home_team_id;

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 1,
            'away_score' => 0,
            'events' => [
                ['type' => 'goal', 'team_id' => $home, 'minute' => 10],
            ],
        ])->assertOk();

        $player = Player::factory()->create(['team_id' => $home]);

        $event = $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events", [
            'type' => 'second_yellow',
            'team_id' => $home,
            'player_id' => $player->id,
            'minute' => 60,
            'added_time' => 5,
        ])->assertCreated()
            ->json('data');

        $this->assertSame('second_yellow', $event['type']);
        $this->assertSame(5, $event['added_time']);

        $match = $fixture->fresh()->match;
        $this->assertSame(1, $match->home_score);
        $this->assertSame(0, $match->away_score);
    }

    public function test_second_yellow_counts_as_dismissal_and_blocks_later_events(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament);
        $this->generateFixtures($tournament);

        $fixture = $this->firstFixture($tournament);
        $home = $fixture->home_team_id;

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 0,
            'away_score' => 0,
        ])->assertOk();

        $player = Player::factory()->create(['team_id' => $home]);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events", [
            'type' => 'second_yellow',
            'team_id' => $home,
            'player_id' => $player->id,
            'minute' => 30,
        ])->assertCreated();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events", [
            'type' => 'goal',
            'team_id' => $home,
            'player_id' => $player->id,
            'minute' => 40,
        ])->assertUnprocessable();
    }

    public function test_legacy_cards_array_accepts_second_yellow(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament);
        $this->generateFixtures($tournament);

        $fixture = $this->firstFixture($tournament);
        $home = $fixture->home_team_id;

        $player = Player::factory()->create(['team_id' => $home]);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 0,
            'away_score' => 0,
            'cards' => [
                ['type' => 'second_yellow', 'team_id' => $home, 'player_id' => $player->id, 'minute' => 55],
            ],
        ])->assertOk();

        $event = MatchEvent::query()
            ->where('match_id', $fixture->fresh()->match_id)
            ->where('type', MatchEventType::SecondYellow->value)
            ->first();

        $this->assertNotNull($event);
        $this->assertSame((int) $player->id, (int) $event->player_id);
    }

    public function test_knockout_penalties_edit_recomputes_winner(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament);
        $this->generateFixtures($tournament);

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

        $this->postJson("/api/committee/tournaments/{$tournament->id}/bracket")->assertOk();
        $this->postJson("/api/committee/tournaments/{$tournament->id}/bracket/populate")->assertOk();

        $semiRound = Round::query()
            ->where('competition_id', $tournament->competition_id)
            ->where('name', 'نصف النهائي')
            ->firstOrFail();

        $semi = Fixture::query()->where('round_id', $semiRound->id)->orderBy('id')->firstOrFail();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$semi->id}/result", [
            'home_score' => 1,
            'away_score' => 1,
            'home_penalties' => 4,
            'away_penalties' => 3,
        ])->assertOk();

        $this->assertSame((int) $semi->home_team_id, (int) $semi->fresh()->match->winner_team_id);

        $this->putJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$semi->id}/result", [
            'home_penalties' => 3,
            'away_penalties' => 4,
        ])->assertOk();

        $match = $semi->fresh()->match;
        $this->assertSame((int) $semi->away_team_id, (int) $match->winner_team_id);
        $this->assertSame(3, $match->home_penalties);
        $this->assertSame(4, $match->away_penalties);
    }

    public function test_double_round_robin_exposes_leg_flag(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament);
        $this->generateFixtures($tournament, ['double_round_robin' => true]);

        $fixtures = $this->getJson("/api/committee/tournaments/{$tournament->id}/fixtures")
            ->assertOk()
            ->json('data');

        $this->assertCount(24, $fixtures);

        $legs = collect($fixtures)->pluck('leg')->filter()->all();
        $this->assertCount(24, $legs);
        $this->assertSame(12, collect($legs)->filter(fn ($leg) => $leg === 'first')->count());
        $this->assertSame(12, collect($legs)->filter(fn ($leg) => $leg === 'second')->count());
    }

    public function test_finished_match_blocks_second_enter_but_allows_edit(): void
    {
        $tournament = $this->createTournament();
        $this->addTeamsAndDraw($tournament);
        $this->generateFixtures($tournament);

        $fixture = $this->firstFixture($tournament);

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 2,
            'away_score' => 1,
        ])->assertOk();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 3,
            'away_score' => 0,
        ])->assertUnprocessable();

        $this->putJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 3,
            'away_score' => 0,
        ])->assertOk();

        $match = $fixture->fresh()->match;
        $this->assertSame(3, $match->home_score);
        $this->assertSame(0, $match->away_score);
    }
}
