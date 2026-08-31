<?php

namespace Tests\Feature\Committee;

use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\StreamsProgress;
use Tests\TestCase;

class TournamentResultHalfTimingTest extends TestCase
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
            'name' => 'بطولة الأشواط '.uniqid(),
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

    private function setupMatch(): array
    {
        $teamIds = $this->makeTeams(8);

        $tournament = $this->createTournament();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/teams", ['team_ids' => $teamIds])->assertOk();
        $this->postJson("/api/committee/tournaments/{$tournament->id}/draw")->assertOk();
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures")->assertCreated();

        $fixture = $this->firstFixture($tournament);

        return [$tournament, $fixture];
    }

    public function test_valid_first_half_event_succeeds_when_live(): void
    {
        $this->section('per-half validation: valid first-half event');

        [$tournament, $fixture] = $this->setupMatch();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/start")->assertOk();

        $this->step('started match, recording a first-half goal at minute 30');

        $event = $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events", [
            'type' => 'goal',
            'team_id' => $fixture->home_team_id,
            'minute' => 30,
            'half' => 'first',
        ])->assertCreated()
            ->json('data');

        $this->assertSame('first', $event['half']);
        $this->assertSame(30, $event['minute']);

        $this->note('first-half event recorded with half=first');
    }

    public function test_event_beyond_half_duration_plus_extra_rejected(): void
    {
        $this->section('per-half upper bound enforces half duration + extra');

        [$tournament, $fixture] = $this->setupMatch();

        // First half default duration 45, extra 0 -> max 45.
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/start")->assertOk();

        $this->step('attempting a first-half event at minute 46 (beyond 45)');

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events", [
            'type' => 'goal',
            'team_id' => $fixture->home_team_id,
            'minute' => 46,
            'half' => 'first',
        ])->assertUnprocessable();

        $this->note('minute 46 in first half rejected');

        // Raising the first-half extra time to 5 extends the bound to 50.
        $this->putJson("/api/committee/tournaments/{$tournament->id}", [
            'first_half_extra_minutes' => 5,
        ])->assertOk();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events", [
            'type' => 'goal',
            'team_id' => $fixture->home_team_id,
            'minute' => 50,
            'half' => 'first',
        ])->assertCreated();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events", [
            'type' => 'goal',
            'team_id' => $fixture->home_team_id,
            'minute' => 51,
            'half' => 'first',
        ])->assertUnprocessable();

        $this->note('after extra=5 first half accepts minute 50 but rejects 51');
    }

    public function test_second_half_flow_accepts_and_rejects_bounds(): void
    {
        $this->section('half-time to second half + second-half bound');

        [$tournament, $fixture] = $this->setupMatch();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/start")->assertOk();

        // Move to halftime then start the second half.
        $this->putJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'status' => 'halftime',
        ])->assertOk();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/start-second-half")
            ->assertOk();

        $match = $fixture->fresh()->match;
        $this->assertEquals(MatchStatus::SecondHalf, $match->status);
        $this->assertNotNull($match->second_half_started_at);

        $this->step('second half started, second_half_started_at stamped');

        // Second half default duration 45, extra 0 -> max 45.
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events", [
            'type' => 'goal',
            'team_id' => $fixture->home_team_id,
            'minute' => 45,
            'half' => 'second',
        ])->assertCreated();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events", [
            'type' => 'goal',
            'team_id' => $fixture->home_team_id,
            'minute' => 46,
            'half' => 'second',
        ])->assertUnprocessable();

        $this->note('second half accepts minute 45 but rejects 46');
    }

    public function test_extra_time_input_rejects_more_than_30(): void
    {
        $this->section('added time capped at 30');

        [$tournament, $fixture] = $this->setupMatch();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/start")->assertOk();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events", [
            'type' => 'goal',
            'team_id' => $fixture->home_team_id,
            'minute' => 30,
            'added_time' => 31,
            'half' => 'first',
        ])->assertUnprocessable();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/events", [
            'type' => 'goal',
            'team_id' => $fixture->home_team_id,
            'minute' => 30,
            'added_time' => 30,
            'half' => 'first',
        ])->assertCreated();

        $this->note('added_time 31 rejected, 30 accepted');
    }

    public function test_result_resource_exposes_timer_and_half_timing(): void
    {
        $this->section('timer fields exposed on the result resource');

        [$tournament, $fixture] = $this->setupMatch();

        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/start")->assertOk();

        $detail = $this->getJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result")
            ->assertOk()
            ->json('data.match');

        $this->assertNotNull($detail['started_at']);
        $this->assertNotNull($detail['kicked_off_at']);
        $this->assertSame(45, $detail['half_duration_minutes']);
        $this->assertSame(0, $detail['first_half_extra_minutes']);
        $this->assertSame(0, $detail['second_half_extra_minutes']);

        $this->note('result resource exposes started_at, kicked_off_at, half durations');
    }

    public function test_feature_flags_do_not_break_legacy_result_entry(): void
    {
        $this->section('legacy whole-match minutes remain accepted on direct result entry');

        [$tournament, $fixture] = $this->setupMatch();

        // Direct result entry without a live phase stays on the whole-match scale.
        $this->postJson("/api/committee/tournaments/{$tournament->id}/fixtures/{$fixture->id}/result", [
            'home_score' => 1,
            'away_score' => 0,
            'events' => [
                ['type' => 'goal', 'team_id' => $fixture->home_team_id, 'minute' => 60],
            ],
        ])->assertOk();

        $this->note('direct final-result entry with a second-half-scale minute still accepted');
    }
}
