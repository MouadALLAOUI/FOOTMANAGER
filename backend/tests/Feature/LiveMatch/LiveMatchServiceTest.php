<?php

namespace Tests\Feature\LiveMatch;

use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Match\Models\PlayerMatchPerformance;
use App\Domains\Match\Services\LiveMatchService;
use App\Domains\Match\Services\MatchEventService;
use App\Domains\Match\Services\PlayerPerformanceService;
use App\Domains\Player\Models\Player;
use App\Domains\Shared\Exceptions\MatchStateException;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LiveMatchServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->homeManager = User::factory()->approved()->create();
        $this->awayManager = User::factory()->approved()->create();
        $this->homeTeam = Team::factory()->create(['manager_id' => $this->homeManager->id]);
        $this->awayTeam = Team::factory()->create(['manager_id' => $this->awayManager->id]);
        $this->match = FootballMatch::create([
            'home_team_id' => $this->homeTeam->id,
            'away_team_id' => $this->awayTeam->id,
            'status' => MatchStatus::Scheduled,
            'current_minute' => 0,
            'home_score' => 0,
            'away_score' => 0,
            'match_duration_minutes' => 90,
            'created_by' => $this->homeManager->id,
        ]);
    }

    public function test_match_lifecycle_from_scheduled_to_finished(): void
    {
        $service = app(LiveMatchService::class);

        $started = $service->start($this->match, $this->homeManager->id);

        $this->assertTrue($started->status->isLive());
        $this->assertNotNull($started->kicked_off_at);
        $this->assertSame('first_half', $started->current_period);

        $resumed = $service->resume($started, $this->homeManager->id);
        $this->assertSame('second_half', $resumed->current_period);

        $finished = $service->finish($resumed, $this->homeManager->id);

        $this->assertSame(MatchStatus::Finished, $finished->status);
        $this->assertNotNull($finished->ended_at);
    }

    public function test_recording_goals_updates_score_and_winner(): void
    {
        $eventService = app(MatchEventService::class);
        $liveService = app(LiveMatchService::class);

        $liveService->start($this->match, $this->homeManager->id);

        $eventService->record($this->match, [
            'type' => 'goal',
            'team_id' => $this->homeTeam->id,
            'minute' => 10,
        ], $this->homeManager->id);

        $eventService->record($this->match, [
            'type' => 'goal',
            'team_id' => $this->homeTeam->id,
            'minute' => 25,
        ], $this->homeManager->id);

        $eventService->record($this->match, [
            'type' => 'goal',
            'team_id' => $this->awayTeam->id,
            'minute' => 40,
        ], $this->awayManager->id);

        $this->assertSame(2, $this->match->home_score);
        $this->assertSame(1, $this->match->away_score);

        $liveService->finish($this->match, $this->homeManager->id);

        $this->assertSame($this->homeTeam->id, $this->match->winner_team_id);
    }

    public function test_finishing_updates_team_records(): void
    {
        $this->match->home_score = 1;
        $this->match->away_score = 0;
        $this->match->status = MatchStatus::FirstHalf;
        $this->match->kicked_off_at = now();
        $this->match->save();

        app(LiveMatchService::class)->finish($this->match, $this->homeManager->id);

        $this->homeTeam->refresh();
        $this->awayTeam->refresh();

        $this->assertSame(1, $this->homeTeam->matches_played);
        $this->assertSame(1, $this->homeTeam->wins);
        $this->assertSame(3, $this->homeTeam->points);
        $this->assertSame(1, $this->homeTeam->goals_for);

        $this->assertSame(1, $this->awayTeam->matches_played);
        $this->assertSame(1, $this->awayTeam->losses);
        $this->assertSame(0, $this->awayTeam->points);
    }

    public function test_performances_are_synced_into_career_stats(): void
    {
        $playerUser = User::factory()->approved()->create(['role' => 'player']);
        $player = Player::factory()->create([
            'team_id' => $this->homeTeam->id,
            'user_id' => $playerUser->id,
        ]);

        $this->match->status = MatchStatus::FirstHalf;
        $this->match->kicked_off_at = now();
        $this->match->save();

        app(PlayerPerformanceService::class)->upsertPerformance($this->match, $player->id, [
            'team_id' => $this->homeTeam->id,
            'minutes_played' => 90,
            'goals' => 1,
            'rating' => 8.5,
        ]);

        $this->match->home_score = 1;
        $this->match->away_score = 0;
        $this->match->save();

        app(LiveMatchService::class)->finish($this->match, $this->homeManager->id);

        $this->assertDatabaseHas('player_match_stats', [
            'user_id' => $playerUser->id,
            'result' => 'win',
            'goals' => 1,
        ]);

        $career = $playerUser->statistics;
        $this->assertNotNull($career);
        $this->assertSame(1, $career->matches_played);
        $this->assertSame(1, $career->wins);
        $this->assertSame(1, $career->goals);

        $performance = PlayerMatchPerformance::query()
            ->where('match_id', $this->match->id)
            ->where('player_id', $player->id)
            ->first();
        $this->assertSame(1, $performance->goals);
    }

    public function test_cannot_record_events_after_finish(): void
    {
        $this->match->status = MatchStatus::Finished;
        $this->match->ended_at = now();
        $this->match->save();

        $this->expectException(MatchStateException::class);

        app(MatchEventService::class)->record($this->match, [
            'type' => 'goal',
            'team_id' => $this->homeTeam->id,
        ], $this->homeManager->id);
    }
}
