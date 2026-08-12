<?php

namespace Tests\Feature\Review;

use App\Domains\Booking\Models\TerrainBooking;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Player\Models\Player;
use App\Domains\Review\Models\PlayerReview;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReviewApiTest extends TestCase
{
    use RefreshDatabase;

    private User $reviewer;

    private Player $player;

    private Stadium $stadium;

    private TerrainBooking $booking;

    private Team $team;

    protected function setUp(): void
    {
        parent::setUp();

        $this->reviewer = User::factory()->approved()->create(['role' => 'player']);

        $playerUser = User::factory()->approved()->create(['role' => 'player']);
        $this->team = Team::factory()->create(['manager_id' => $this->reviewer->id]);
        $this->player = Player::factory()->create([
            'team_id' => $this->team->id,
            'user_id' => $playerUser->id,
        ]);

        $this->stadium = Stadium::factory()->create(['owner_id' => User::factory()->terrainOwner()->create()->id]);

        $this->booking = TerrainBooking::query()->create([
            'terrain_id' => $this->stadium->id,
            'manager_id' => $this->reviewer->id,
            'team_id' => $this->team->id,
            'booking_type' => 'match',
            'reservation_type' => 'single',
            'booking_date' => now()->subDay()->toDateString(),
            'start_time' => '20:00',
            'end_time' => '21:00',
            'total' => 200,
            'status' => 'confirmed',
        ]);
    }

    protected function makeMatch(Player $player): FootballMatch
    {
        $team = $player->team;

        return FootballMatch::create([
            'home_team_id' => $team->id,
            'away_team_id' => Team::factory()->create()->id,
            'status' => MatchStatus::Finished,
            'home_score' => 1,
            'away_score' => 0,
            'match_duration_minutes' => 90,
            'kicked_off_at' => now()->subDay(),
            'ended_at' => now()->subDay(),
            'created_by' => $this->reviewer->id,
        ]);
    }

    public function test_user_can_review_player_after_match(): void
    {
        $match = $this->makeMatch($this->player);

        Sanctum::actingAs($this->reviewer);

        $this->postJson("/api/v1/players/{$this->player->id}/reviews/{$match->id}", [
            'rating' => 4,
            'sportsmanship' => 5,
            'teamwork' => 4,
            'skill' => 3,
            'punctuality' => 5,
            'comment' => 'لاعب ممتاز',
        ])->assertCreated()
            ->assertJsonPath('data.rating', 4);

        $this->assertDatabaseHas('player_reviews', [
            'player_id' => $this->player->id,
            'reviewer_id' => $this->reviewer->id,
        ]);

        $this->assertSame('4.00', $this->player->fresh()->rating_avg);
    }

    public function test_cannot_review_same_player_twice_in_same_match(): void
    {
        $match = $this->makeMatch($this->player);

        Sanctum::actingAs($this->reviewer);

        $payload = [
            'rating' => 4,
            'sportsmanship' => 5,
            'teamwork' => 4,
            'skill' => 3,
            'punctuality' => 5,
        ];

        $this->postJson("/api/v1/players/{$this->player->id}/reviews/{$match->id}", $payload)->assertCreated();
        $this->postJson("/api/v1/players/{$this->player->id}/reviews/{$match->id}", $payload)->assertStatus(422);
    }

    public function test_user_cannot_review_themselves(): void
    {
        $team = Team::factory()->create(['manager_id' => $this->reviewer->id]);
        $ownPlayer = Player::factory()->create([
            'team_id' => $team->id,
            'user_id' => $this->reviewer->id,
        ]);
        $match = $this->makeMatch($ownPlayer);

        Sanctum::actingAs($this->reviewer);

        $this->postJson("/api/v1/players/{$ownPlayer->id}/reviews/{$match->id}", [
            'rating' => 5,
            'sportsmanship' => 5,
            'teamwork' => 5,
            'skill' => 5,
            'punctuality' => 5,
        ])->assertStatus(422);
    }

    public function test_user_can_review_stadium_after_own_booking(): void
    {
        Sanctum::actingAs($this->reviewer);

        $this->postJson("/api/v1/stadiums/{$this->stadium->id}/reviews/{$this->booking->id}", [
            'overall_rating' => 5,
            'field_quality' => 4,
            'lighting' => 5,
            'cleanliness' => 4,
            'facilities' => 3,
            'parking' => 4,
            'comment' => 'ملعب نظيف',
            'recommend' => true,
        ])->assertCreated()
            ->assertJsonPath('data.overall_rating', 5);

        $this->assertSame('5.00', $this->stadium->fresh()->rating);
        $this->assertSame(1, $this->stadium->fresh()->reviews_count);
    }

    public function test_cannot_review_booking_that_is_not_own(): void
    {
        $otherBooking = TerrainBooking::query()->create([
            'terrain_id' => $this->stadium->id,
            'manager_id' => User::factory()->approved()->create()->id,
            'team_id' => Team::factory()->create()->id,
            'booking_type' => 'match',
            'reservation_type' => 'single',
            'booking_date' => now()->subDay()->toDateString(),
            'start_time' => '22:00',
            'end_time' => '23:00',
            'total' => 200,
            'status' => 'confirmed',
        ]);

        Sanctum::actingAs($this->reviewer);

        $this->postJson("/api/v1/stadiums/{$this->stadium->id}/reviews/{$otherBooking->id}", [
            'overall_rating' => 3,
        ])->assertForbidden();
    }

    public function test_player_reviews_are_listed_publicly(): void
    {
        PlayerReview::query()->create([
            'player_id' => $this->player->id,
            'match_id' => $this->makeMatch($this->player)->id,
            'reviewer_id' => $this->reviewer->id,
            'rating' => 4,
            'sportsmanship' => 5,
            'teamwork' => 4,
            'skill' => 3,
            'punctuality' => 5,
        ]);

        $this->getJson("/api/v1/players/{$this->player->id}/reviews")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.rating', 4);
    }
}
