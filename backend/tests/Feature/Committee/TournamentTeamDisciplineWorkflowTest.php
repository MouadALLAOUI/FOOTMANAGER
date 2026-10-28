<?php

namespace Tests\Feature\Committee;

use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\StreamsProgress;
use Tests\TestCase;

class TournamentTeamDisciplineWorkflowTest extends TestCase
{
    use RefreshDatabase;
    use StreamsProgress;

    private User $committee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->committee = User::factory()->committee()->approved()->create();
        Sanctum::actingAs($this->committee);
    }

    private function createLeagueTournament(array $overrides = []): Tournament
    {
        $payload = array_merge([
            'name' => 'دوري الاختبار '.uniqid(),
            'category' => 'أكابر',
            'location' => 'الدار البيضاء',
            'start_date' => Carbon::now()->addDays(2)->toDateString(),
            'end_date' => Carbon::now()->addDays(30)->toDateString(),
            'tournament_format' => 'league',
            'league_mode' => 'single_round_robin',
            'rest_days_minimum' => 2,
            'teams_count' => 4,
            'groups_count' => 1,
            'teams_per_group' => 4,
            'points_for_win' => 3,
            'points_for_draw' => 1,
            'points_for_loss' => 0,
        ], $overrides);

        $response = $this->postJson('/api/committee/tournaments', $payload)->assertCreated();

        return Tournament::findOrFail($response->json('data.id'));
    }

    private function createStadium(): Stadium
    {
        return Stadium::factory()->create([
            'name' => 'ملعب الاختبار',
            'supports_tournaments' => true,
            'is_open' => true,
            'is_available' => true,
        ]);
    }

    private function registerTeams(Tournament $tournament, int $count = 4): array
    {
        $teams = [];
        $teamIds = [];

        for ($i = 1; $i <= $count; $i++) {
            $team = Team::factory()->create(['name' => "فريق {$i} ".uniqid()]);
            $teams[] = $team;
            $teamIds[] = $team->id;
        }

        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams", [
            'team_ids' => $teamIds,
        ])->assertOk();

        return $teams;
    }

    private function generateFixtures(Tournament $tournament, Stadium $stadium): void
    {
        $this->postJson("/api/committee/tournaments/{$tournament->id}/league/fixtures/generate", [
            'days_of_week' => [5, 6],
            'time_slots' => ['18:00', '20:00'],
            'stadium_ids' => [$stadium->id],
        ])->assertOk();
    }

    public function test_expulsion_with_apply_remaining_awards_default_wins_and_updates_standings(): void
    {
        $this->section('Testing expulsion with apply_remaining = true');

        $tournament = $this->createLeagueTournament();
        $stadium = $this->createStadium();
        $teams = $this->registerTeams($tournament, 4);
        $this->generateFixtures($tournament, $stadium);

        $expelledTeam = $teams[0];

        $this->step('Check initial standings');
        $initialStandingsRes = $this->getJson("/api/committee/tournaments/{$tournament->id}/standings")->assertOk();
        $initialRows = $initialStandingsRes->json('data.groups.0.rows');
        $this->assertCount(4, $initialRows);
        foreach ($initialRows as $row) {
            $this->assertEquals(0, $row['points']);
            $this->assertEquals(0, $row['played']);
        }

        $this->step('Disqualify team with apply_remaining = true');
        $disqualifyRes = $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/{$expelledTeam->id}/disqualify", [
            'reason' => 'سوء سلوك انضباطي معتمد',
            'apply_remaining' => true,
        ])->assertOk();

        $this->note('Verify team pivot status is disqualified');
        $tt = TournamentTeam::where('tournament_id', $tournament->id)->where('team_id', $expelledTeam->id)->first();
        $this->assertEquals(TournamentTeam::STATUS_DISQUALIFIED, $tt->status);

        $this->note('Verify all remaining fixtures involving expelled team are now Played with default result');
        $fixtures = Fixture::where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where(function ($q) use ($expelledTeam) {
                $q->where('home_team_id', $expelledTeam->id)->orWhere('away_team_id', $expelledTeam->id);
            })
            ->get();

        $this->assertNotEmpty($fixtures);
        foreach ($fixtures as $f) {
            $this->assertEquals(FixtureStatus::Played, $f->status);
            $this->assertNotNull($f->match);
            $this->assertEquals(MatchStatus::Finished, $f->match->status);
            $this->assertStringContainsString('[default_result:points_only]', $f->match->notes);
        }

        $this->step('Verify standings were updated dynamically with default points');
        $standingsRes = $this->getJson("/api/committee/tournaments/{$tournament->id}/standings")->assertOk();
        $rows = $standingsRes->json('data.groups.0.rows');

        $rowsByTeam = [];
        foreach ($rows as $r) {
            $rowsByTeam[$r['team_id']] = $r;
        }

        // Expelled team should have 0 points, 3 losses, 0 goals for/against
        $expelledRow = $rowsByTeam[$expelledTeam->id];
        $this->assertEquals(0, $expelledRow['points']);
        $this->assertEquals(3, $expelledRow['losses']);
        $this->assertEquals(0, $expelledRow['goal_difference']);
        $this->assertEquals(TournamentTeam::STATUS_DISQUALIFIED, $expelledRow['status']);

        // Other 3 teams should each have 3 points and 1 win, with 0 goal difference (points-only default result)
        for ($i = 1; $i < 4; $i++) {
            $opponentRow = $rowsByTeam[$teams[$i]->id];
            $this->assertEquals(3, $opponentRow['points']);
            $this->assertEquals(1, $opponentRow['wins']);
            $this->assertEquals(0, $opponentRow['goal_difference']);
        }
    }

    public function test_expulsion_without_apply_remaining_leaves_fixtures_unplayed(): void
    {
        $this->section('Testing expulsion with apply_remaining = false');

        $tournament = $this->createLeagueTournament();
        $stadium = $this->createStadium();
        $teams = $this->registerTeams($tournament, 4);
        $this->generateFixtures($tournament, $stadium);

        $expelledTeam = $teams[0];

        $this->step('Disqualify team with apply_remaining = false');
        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/{$expelledTeam->id}/disqualify", [
            'reason' => 'طرد دون اعتماد النتائج الفوري',
            'apply_remaining' => false,
        ])->assertOk();

        $this->note('Verify team pivot status is disqualified');
        $tt = TournamentTeam::where('tournament_id', $tournament->id)->where('team_id', $expelledTeam->id)->first();
        $this->assertEquals(TournamentTeam::STATUS_DISQUALIFIED, $tt->status);

        $this->note('Verify fixtures remain Scheduled / unplayed');
        $unplayedFixtures = Fixture::where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where(function ($q) use ($expelledTeam) {
                $q->where('home_team_id', $expelledTeam->id)->orWhere('away_team_id', $expelledTeam->id);
            })
            ->where('status', '!=', FixtureStatus::Played)
            ->count();

        $this->assertEquals(3, $unplayedFixtures);

        $this->step('Verify standings remain at 0 points');
        $standingsRes = $this->getJson("/api/committee/tournaments/{$tournament->id}/standings")->assertOk();
        $rows = $standingsRes->json('data.groups.0.rows');
        foreach ($rows as $r) {
            $this->assertEquals(0, $r['points']);
        }
    }

    public function test_apply_default_result_endpoint_awards_default_win_individually(): void
    {
        $this->section('Testing individual apply-default-result endpoint');

        $tournament = $this->createLeagueTournament();
        $stadium = $this->createStadium();
        $teams = $this->registerTeams($tournament, 4);
        $this->generateFixtures($tournament, $stadium);

        $expelledTeam = $teams[0];

        $this->step('Disqualify team without bulk application');
        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/{$expelledTeam->id}/disqualify", [
            'apply_remaining' => false,
        ])->assertOk();

        $fixture = Fixture::where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where(function ($q) use ($expelledTeam) {
                $q->where('home_team_id', $expelledTeam->id)->orWhere('away_team_id', $expelledTeam->id);
            })
            ->first();

        $opponentId = (int) $fixture->home_team_id === $expelledTeam->id ? (int) $fixture->away_team_id : (int) $fixture->home_team_id;

        $this->step('Apply default result to single fixture');
        $res = $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/apply-default-result", [
            'withdrawn_team_id' => $expelledTeam->id,
        ])->assertOk();

        $this->note('Verify fixture is now played with default result');
        $fixture->refresh();
        $this->assertEquals(FixtureStatus::Played, $fixture->status);
        $this->assertEquals(MatchStatus::Finished, $fixture->match->status);
        $this->assertEquals($opponentId, $fixture->match->winner_team_id);

        $this->step('Verify standings reflect single match default win');
        $standingsRes = $this->getJson("/api/committee/tournaments/{$tournament->id}/standings")->assertOk();
        $rows = $standingsRes->json('data.groups.0.rows');

        $opponentRow = collect($rows)->firstWhere('team_id', $opponentId);
        $this->assertEquals(3, $opponentRow['points']);
        $this->assertEquals(1, $opponentRow['wins']);
    }

    public function test_completed_matches_are_preserved_after_expulsion(): void
    {
        $this->section('Testing preservation of completed matches upon team expulsion');

        $tournament = $this->createLeagueTournament();
        $stadium = $this->createStadium();
        $teams = $this->registerTeams($tournament, 4);
        $this->generateFixtures($tournament, $stadium);

        $teamA = $teams[0];
        $teamB = $teams[1];

        $fixture = Fixture::where('competition_id', $tournament->competition_id)
            ->where('season_id', $tournament->season_id)
            ->where(function ($q) use ($teamA, $teamB) {
                $q->where(fn ($sq) => $sq->where('home_team_id', $teamA->id)->where('away_team_id', $teamB->id))
                    ->orWhere(fn ($sq) => $sq->where('home_team_id', $teamB->id)->where('away_team_id', $teamA->id));
            })
            ->first();

        // Complete this match beforehand with a real 2-1 score
        $match = FootballMatch::create([
            'competition_id' => $tournament->competition_id,
            'season_id' => $tournament->season_id,
            'round_id' => $fixture->round_id,
            'group_id' => $fixture->group_id,
            'home_team_id' => $fixture->home_team_id,
            'away_team_id' => $fixture->away_team_id,
            'stadium_id' => $stadium->id,
            'status' => MatchStatus::Finished,
            'current_period' => 'full_time',
            'current_minute' => 90,
            'home_score' => 2,
            'away_score' => 1,
            'winner_team_id' => $fixture->home_team_id,
            'notes' => 'مباراة ملعوبة كاملة سابقة',
        ]);
        $fixture->update([
            'match_id' => $match->id,
            'status' => FixtureStatus::Played,
        ]);

        $this->step('Disqualify team A with apply_remaining = true');
        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams/{$teamA->id}/disqualify", [
            'reason' => 'طرد بعد خوض مباراة سابقة',
            'apply_remaining' => true,
        ])->assertOk();

        $this->note('Verify the previously completed match is completely preserved');
        $match->refresh();
        $this->assertEquals(MatchStatus::Finished, $match->status);
        $this->assertEquals(2, $match->home_score);
        $this->assertEquals(1, $match->away_score);
        $this->assertStringNotContainsString('[default_result:points_only]', (string) $match->notes);
    }
}
