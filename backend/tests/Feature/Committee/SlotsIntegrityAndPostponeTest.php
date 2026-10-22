<?php

namespace Tests\Feature\Committee;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Booking\Models\TerrainBookingOccurrence;
use App\Domains\Booking\Models\TerrainSlotClosure;
use App\Domains\Booking\Services\SlotAvailabilityService;
use App\Domains\Competition\Enums\FixtureStatus;
use App\Domains\Competition\Models\Fixture;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Stadium\Models\StadiumSchedule;
use App\Domains\Team\Models\Team;
use App\Domains\Tournament\Models\Tournament;
use App\Domains\Tournament\Models\TournamentTeam;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\StreamsProgress;
use Tests\TestCase;

class SlotsIntegrityAndPostponeTest extends TestCase
{
    use RefreshDatabase;
    use StreamsProgress;

    private User $committee;
    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->committee = User::factory()->committee()->approved()->create();
        $this->manager = User::factory()->manager()->approved()->create();
        Sanctum::actingAs($this->committee);
    }

    private function createLeagueTournament(array $overrides = []): Tournament
    {
        $payload = array_merge([
            'name' => 'دوري النزاهة ' . uniqid(),
            'category' => 'أكابر',
            'location' => 'وارزازات',
            'start_date' => Carbon::now()->addDays(2)->toDateString(),
            'end_date' => Carbon::now()->addDays(60)->toDateString(),
            'tournament_format' => 'league',
            'league_mode' => 'single_round_robin',
            'rest_days_minimum' => 1,
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
        $stadium = Stadium::create([
            'name' => 'ملعب منارة دادس ' . uniqid(),
            'address' => 'شارع النخيل، بومالن دادس',
            'city' => 'بومالن دادس',
            'open_time' => '15:00',
            'close_time' => '23:00',
            'is_active' => true,
        ]);

        for ($day = 0; $day <= 6; $day++) {
            StadiumSchedule::create([
                'stadium_id' => $stadium->id,
                'day_of_week' => $day,
                'open_time' => '15:00',
                'close_time' => '23:00',
                'slot_duration_minutes' => 60,
                'is_active' => true,
            ]);
        }

        return $stadium;
    }

    private function createTeamWithManager(string $name): Team
    {
        $mgr = User::factory()->manager()->approved()->create();

        return Team::create([
            'name' => $name . ' ' . uniqid(),
            'manager_id' => $mgr->id,
            'is_active' => true,
        ]);
    }

    /**
     * Step 1.1 & 1.3: Postponing must NOT cancel or archive the weekly subscription booking.
     * Freed occurrence becomes available in calendar and booking form.
     */
    public function test_postponing_league_match_leaves_weekly_subscription_intact(): void
    {
        $this->section('Step 1: Weekly Subscription Integrity on Postpone');

        $tournament = $this->createLeagueTournament();
        $stadium = $this->createStadium();
        $tournament->stadiums()->attach($stadium->id);

        $teamA = $this->createTeamWithManager('أمل دادس');
        $teamB = $this->createTeamWithManager('نجم بومالن');

        TournamentTeam::create(['tournament_id' => $tournament->id, 'team_id' => $teamA->id, 'status' => TournamentTeam::STATUS_REGISTERED]);
        TournamentTeam::create(['tournament_id' => $tournament->id, 'team_id' => $teamB->id, 'status' => TournamentTeam::STATUS_REGISTERED]);

        $nextFriday = Carbon::now()->next(Carbon::FRIDAY);

        $weeklyBooking = TerrainBooking::create([
            'team_id' => $teamA->id,
            'terrain_id' => $stadium->id,
            'booking_reference' => 'SUB-' . uniqid(),
            'reservation_type' => 'weekly_subscription',
            'day_of_week' => Carbon::FRIDAY,
            'start_date' => Carbon::now()->subWeek()->toDateString(),
            'end_date' => Carbon::now()->addMonths(3)->toDateString(),
            'booking_date' => $nextFriday->toDateString(),
            'start_time' => '19:00',
            'end_time' => '20:30',
            'status' => 'confirmed',
        ]);

        $fixture = Fixture::create([
            'competition_id' => $tournament->competition_id,
            'season_id' => $tournament->season_id,
            'home_team_id' => $teamA->id,
            'away_team_id' => $teamB->id,
            'stadium_id' => $stadium->id,
            'scheduled_at' => $nextFriday->copy()->setTime(19, 0),
            'status' => FixtureStatus::Scheduled,
        ]);

        $match = FootballMatch::create([
            'competition_id' => $tournament->competition_id,
            'season_id' => $tournament->season_id,
            'home_team_id' => $teamA->id,
            'away_team_id' => $teamB->id,
            'stadium_id' => $stadium->id,
            'active_reservation_id' => $weeklyBooking->id,
            'status' => MatchStatus::Scheduled,
            'is_confirmed' => true,
        ]);

        $fixture->update(['match_id' => $match->id]);

        TerrainBookingOccurrence::create([
            'terrain_booking_id' => $weeklyBooking->id,
            'occurrence_date' => $nextFriday->toDateString(),
            'stadium_id' => $stadium->id,
            'start_time' => '19:00',
            'end_time' => '20:30',
            'status' => TerrainBookingOccurrence::STATUS_USED_BY_MATCH,
            'fixture_id' => $fixture->id,
        ]);

        $this->step('Postpone the match due to team circumstances');
        $response = $this->postJson("/api/committee/tournaments/{$tournament->id}/league/fixtures/{$fixture->id}/postpone", [
            'reason' => 'team_circumstances',
            'note' => 'طلب تأجيل ودي من الفريق',
            'freed_action' => 'freed',
        ])->assertOk();

        $weeklyBooking->refresh();
        $this->assertNull($weeklyBooking->archived_at, 'Weekly subscription must NEVER be archived by a postponement');
        $this->assertNull($weeklyBooking->cancelled_at, 'Weekly subscription must NEVER be cancelled by a postponement');
        $this->assertSame('weekly_subscription', $weeklyBooking->reservation_type, 'Weekly subscription reservation_type must remain weekly_subscription');
        $this->assertSame('confirmed', $weeklyBooking->status, 'Weekly subscription status must remain confirmed');

        $occ = TerrainBookingOccurrence::where('terrain_booking_id', $weeklyBooking->id)
            ->where('occurrence_date', $nextFriday->toDateString())
            ->first();
        $this->assertNotNull($occ);
        $this->assertSame(TerrainBookingOccurrence::STATUS_FREED, $occ->status);
        $this->assertNull($occ->fixture_id);

        $availabilityService = app(SlotAvailabilityService::class);
        $slots = $availabilityService->getDetailedSlotsForDate($stadium->id, $nextFriday->toDateString());
        $slot19 = collect($slots)->first(fn ($s) => $s['start_time'] === '19:00');
        $this->assertNotNull($slot19);
        $this->assertTrue($slot19['is_available'], 'Freed slot must appear immediately available in SlotAvailabilityService');
    }

    /**
     * Step 1.1: Weather postponement keeps slot reserved and blocked (never offered for reuse).
     */
    public function test_weather_postponement_blocks_slot(): void
    {
        $this->section('Step 1.1 & 2.2: Weather Postponement Blocks Occurrence');

        $tournament = $this->createLeagueTournament();
        $stadium = $this->createStadium();
        $teamA = $this->createTeamWithManager('فريق المطر أ');
        $teamB = $this->createTeamWithManager('فريق المطر ب');

        $matchDate = Carbon::now()->addDays(5);

        $fixture = Fixture::create([
            'competition_id' => $tournament->competition_id,
            'season_id' => $tournament->season_id,
            'home_team_id' => $teamA->id,
            'away_team_id' => $teamB->id,
            'stadium_id' => $stadium->id,
            'scheduled_at' => $matchDate->copy()->setTime(18, 0),
            'status' => FixtureStatus::Scheduled,
        ]);

        $this->step('Postpone match due to rain');
        $response = $this->postJson("/api/committee/tournaments/{$tournament->id}/league/fixtures/{$fixture->id}/postpone", [
            'reason' => 'rain',
            'note' => 'أمطار غزيرة غمرت أرضية الملعب',
        ])->assertOk();

        $closure = TerrainSlotClosure::where('terrain_id', $stadium->id)
            ->where('closure_date', $matchDate->toDateString())
            ->first();
        $this->assertNotNull($closure, 'TerrainSlotClosure must be created on weather postponement');

        $availabilityService = app(SlotAvailabilityService::class);
        $hasConflict = $availabilityService->hasConflict($stadium->id, $matchDate->toDateString(), '18:00', '19:30');
        $this->assertTrue($hasConflict, 'Slot must be blocked on weather postponement');
    }

    /**
     * Step 2.3: Releasing an occurrence to tournament teams restricts visibility to tournament managers only.
     */
    public function test_release_occurrence_to_tournament_teams(): void
    {
        $this->section('Step 2.3: Release Occurrence to Tournament Teams');

        $tournament = $this->createLeagueTournament();
        $stadium = $this->createStadium();
        $teamA = $this->createTeamWithManager('فريق أ');
        $teamB = $this->createTeamWithManager('فريق ب');

        TournamentTeam::create(['tournament_id' => $tournament->id, 'team_id' => $teamA->id, 'status' => TournamentTeam::STATUS_REGISTERED]);
        TournamentTeam::create(['tournament_id' => $tournament->id, 'team_id' => $teamB->id, 'status' => TournamentTeam::STATUS_REGISTERED]);

        $targetDate = Carbon::now()->addDays(7);

        $weeklyBooking = TerrainBooking::create([
            'team_id' => $teamA->id,
            'terrain_id' => $stadium->id,
            'booking_reference' => 'SUB-' . uniqid(),
            'reservation_type' => 'weekly_subscription',
            'day_of_week' => $targetDate->dayOfWeek,
            'start_date' => Carbon::now()->subWeek()->toDateString(),
            'end_date' => Carbon::now()->addMonths(3)->toDateString(),
            'start_time' => '17:00',
            'end_time' => '18:30',
            'status' => 'confirmed',
        ]);

        $occ = TerrainBookingOccurrence::create([
            'terrain_booking_id' => $weeklyBooking->id,
            'occurrence_date' => $targetDate->toDateString(),
            'stadium_id' => $stadium->id,
            'start_time' => '17:00',
            'end_time' => '18:30',
            'status' => TerrainBookingOccurrence::STATUS_ACTIVE,
        ]);

        $this->step('Release occurrence to tournament teams');
        $releaseRes = $this->postJson("/api/committee/tournaments/{$tournament->id}/league/occurrences/{$occ->id}/release")->assertOk();

        $occ->refresh();
        $this->assertSame(TerrainBookingOccurrence::STATUS_RELEASED, $occ->status);
        $this->assertSame($tournament->id, (int) ($occ->metadata['tournament_id'] ?? 0));

        $this->step('Check visibility: available for tournament, blocked for outsiders');
        $availabilityService = app(SlotAvailabilityService::class);

        $slotsForTournament = $availabilityService->getDetailedSlotsForDate($stadium->id, $targetDate->toDateString(), forTournamentId: $tournament->id);
        $slot17ForTourn = collect($slotsForTournament)->first(fn ($s) => $s['start_time'] === '17:00');
        $this->assertTrue($slot17ForTourn['is_available'], 'Occurrence released to tournament must be available for tournament teams');

        $slotsForOutsider = $availabilityService->getDetailedSlotsForDate($stadium->id, $targetDate->toDateString(), forTournamentId: null);
        $slot17ForOutsider = collect($slotsForOutsider)->first(fn ($s) => $s['start_time'] === '17:00');
        $this->assertFalse($slot17ForOutsider['is_available'], 'Occurrence released to tournament must remain blocked for outsiders');

        $this->step('Organizer reclaims the occurrence');
        $reclaimRes = $this->postJson("/api/committee/tournaments/{$tournament->id}/league/occurrences/{$occ->id}/reclaim")->assertOk();
        $occ->refresh();
        $this->assertSame(TerrainBookingOccurrence::STATUS_ACTIVE, $occ->status);
    }

    /**
     * Step 2.1: Moving borrowed match to an unused slot of one of its two teams removes borrowed label.
     */
    public function test_move_borrowed_match_to_own_slot(): void
    {
        $this->section('Step 2.1: Move Borrowed Match to Own Slot');

        $tournament = $this->createLeagueTournament();
        $stadium = $this->createStadium();
        $teamA = $this->createTeamWithManager('الطرف الأول');
        $teamB = $this->createTeamWithManager('الطرف الثاني');
        $teamC = $this->createTeamWithManager('صاحب الحجز المستعار');

        $borrowedBooking = TerrainBooking::create([
            'team_id' => $teamC->id,
            'terrain_id' => $stadium->id,
            'booking_reference' => 'BORROWED-' . uniqid(),
            'reservation_type' => 'weekly_subscription',
            'day_of_week' => Carbon::SATURDAY,
            'start_date' => Carbon::now()->subWeek()->toDateString(),
            'end_date' => Carbon::now()->addMonths(2)->toDateString(),
            'start_time' => '16:00',
            'end_time' => '17:30',
            'status' => 'confirmed',
        ]);

        $sat = Carbon::now()->next(Carbon::SATURDAY);

        $fixture = Fixture::create([
            'competition_id' => $tournament->competition_id,
            'season_id' => $tournament->season_id,
            'home_team_id' => $teamA->id,
            'away_team_id' => $teamB->id,
            'stadium_id' => $stadium->id,
            'scheduled_at' => $sat->copy()->setTime(16, 0),
            'status' => FixtureStatus::Scheduled,
        ]);

        $match = FootballMatch::create([
            'competition_id' => $tournament->competition_id,
            'season_id' => $tournament->season_id,
            'home_team_id' => $teamA->id,
            'away_team_id' => $teamB->id,
            'stadium_id' => $stadium->id,
            'active_reservation_id' => $borrowedBooking->id,
            'status' => MatchStatus::Scheduled,
            'is_confirmed' => true,
            'notes' => 'توقيت مستعار من حجز فريق ' . $teamC->name,
        ]);

        $fixture->update(['match_id' => $match->id]);

        $teamABooking = TerrainBooking::create([
            'team_id' => $teamA->id,
            'terrain_id' => $stadium->id,
            'booking_reference' => 'OWNSLOT-' . uniqid(),
            'reservation_type' => 'weekly_subscription',
            'day_of_week' => Carbon::SUNDAY,
            'start_date' => Carbon::now()->subWeek()->toDateString(),
            'end_date' => Carbon::now()->addMonths(2)->toDateString(),
            'start_time' => '18:00',
            'end_time' => '19:30',
            'status' => 'confirmed',
        ]);

        $sun = Carbon::now()->next(Carbon::SUNDAY);

        $this->step('Move borrowed match to team A own slot');
        $res = $this->postJson("/api/committee/tournaments/{$tournament->id}/league/fixtures/{$fixture->id}/move-to-own-slot", [
            'booking_id' => $teamABooking->id,
            'date' => $sun->toDateString(),
        ])->assertOk();

        $match->refresh();
        $this->assertStringNotContainsString('مستعار', (string) $match->notes, 'Borrowed label must be removed when match is moved to own slot');
        $this->assertSame($teamABooking->id, $match->active_reservation_id);
    }

    /**
     * Step 3: Unused slot pool categorizes finished teams, released occurrences, and provides quick assign.
     */
    public function test_unused_slot_pool_and_quick_assign(): void
    {
        $this->section('Step 3: Unused Slot Pool and Quick Assign');

        $tournament = $this->createLeagueTournament();
        $stadium = $this->createStadium();
        $tournament->stadiums()->attach($stadium->id);

        $teamA = $this->createTeamWithManager('فريق منجز 1');
        $teamB = $this->createTeamWithManager('فريق منجز 2');
        $teamC = $this->createTeamWithManager('فريق معلق 3');

        TournamentTeam::create(['tournament_id' => $tournament->id, 'team_id' => $teamA->id, 'status' => TournamentTeam::STATUS_REGISTERED]);
        TournamentTeam::create(['tournament_id' => $tournament->id, 'team_id' => $teamB->id, 'status' => TournamentTeam::STATUS_REGISTERED]);
        TournamentTeam::create(['tournament_id' => $tournament->id, 'team_id' => $teamC->id, 'status' => TournamentTeam::STATUS_REGISTERED]);

        // Team A has finished its matches
        $finishedFixture = Fixture::create([
            'competition_id' => $tournament->competition_id,
            'season_id' => $tournament->season_id,
            'home_team_id' => $teamA->id,
            'away_team_id' => $teamB->id,
            'stadium_id' => $stadium->id,
            'status' => FixtureStatus::Played,
        ]);
        FootballMatch::create([
            'competition_id' => $tournament->competition_id,
            'season_id' => $tournament->season_id,
            'home_team_id' => $teamA->id,
            'away_team_id' => $teamB->id,
            'stadium_id' => $stadium->id,
            'status' => MatchStatus::Finished,
            'home_score' => 2,
            'away_score' => 1,
            'is_confirmed' => true,
        ]);

        // Team A future weekly subscription
        $targetDate = Carbon::now()->addDays(10);
        $teamABooking = TerrainBooking::create([
            'team_id' => $teamA->id,
            'terrain_id' => $stadium->id,
            'booking_reference' => 'SUB-A-' . uniqid(),
            'reservation_type' => 'weekly_subscription',
            'day_of_week' => $targetDate->dayOfWeek,
            'start_date' => Carbon::now()->subWeek()->toDateString(),
            'end_date' => Carbon::now()->addMonths(2)->toDateString(),
            'start_time' => '16:00',
            'end_time' => '17:30',
            'status' => 'confirmed',
        ]);

        // Unscheduled fixture
        $pendingFixture = Fixture::create([
            'competition_id' => $tournament->competition_id,
            'season_id' => $tournament->season_id,
            'home_team_id' => $teamB->id,
            'away_team_id' => $teamC->id,
            'status' => FixtureStatus::WaitingForBooking,
        ]);

        $this->step('Fetch unused slot pool');
        $poolRes = $this->getJson("/api/committee/tournaments/{$tournament->id}/league/unused-slot-pool?fixture_id={$pendingFixture->id}")->assertOk();

        $defaultPool = $poolRes->json('data.default_pool');
        $this->assertNotEmpty($defaultPool, 'Default pool must contain available slots');

        $this->step('Quick assign slot to pending fixture');
        $assignRes = $this->postJson("/api/committee/tournaments/{$tournament->id}/league/fixtures/{$pendingFixture->id}/quick-assign", [
            'booking_id' => $teamABooking->id,
            'date' => $targetDate->toDateString(),
        ])->assertOk();

        $pendingFixture->refresh();
        $this->assertSame(FixtureStatus::Scheduled, $pendingFixture->status);
        $this->assertSame($stadium->id, $pendingFixture->stadium_id);
        $this->assertNotNull($pendingFixture->scheduled_at);
        $this->assertStringContainsString('مستعار', (string) $pendingFixture->match?->notes);
    }
}
