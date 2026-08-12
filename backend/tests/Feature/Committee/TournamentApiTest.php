<?php

namespace Tests\Feature\Committee;

use App\Domains\Tournament\Models\Tournament;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TournamentApiTest extends TestCase
{
    use RefreshDatabase;

    private User $committee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->committee = User::factory()->committee()->approved()->create();
    }

    public function test_committee_can_list_own_tournaments(): void
    {
        Sanctum::actingAs($this->committee);

        Tournament::create([
            'organizer_id' => $this->committee->id,
            'name' => 'بطولة الاختبار',
            'start_date' => '2026-09-01',
            'status' => 'draft',
            'tournament_format' => 'groups_knockout',
            'teams_count' => 8,
            'groups_count' => 2,
            'teams_per_group' => 4,
        ]);

        $this->getJson('/api/committee/tournaments')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'بطولة الاختبار');
    }

    public function test_committee_can_create_tournament(): void
    {
        Sanctum::actingAs($this->committee);

        $this->postJson('/api/committee/tournaments', [
            'name' => 'بطولة رمضان',
            'description' => 'بطولة تجريبية',
            'location' => 'الدار البيضاء',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-15',
            'tournament_format' => 'groups_knockout',
            'teams_count' => 8,
            'groups_count' => 2,
            'teams_per_group' => 4,
            'points_for_win' => 3,
            'points_for_draw' => 1,
            'points_for_loss' => 0,
        ])->assertCreated()
            ->assertJsonPath('data.name', 'بطولة رمضان')
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.organizer.id', $this->committee->id);

        $this->assertDatabaseHas('tournaments', ['name' => 'بطولة رمضان']);
    }

    public function test_teams_count_must_match_groups_times_teams_per_group(): void
    {
        Sanctum::actingAs($this->committee);

        $this->postJson('/api/committee/tournaments', [
            'name' => 'بطولة خاطئة',
            'start_date' => '2026-09-01',
            'tournament_format' => 'groups_knockout',
            'teams_count' => 9,
            'groups_count' => 2,
            'teams_per_group' => 4,
        ])->assertUnprocessable();

        $this->assertDatabaseCount('tournaments', 0);
    }

    public function test_non_committee_cannot_create_tournament(): void
    {
        $manager = User::factory()->approved()->create(['role' => 'manager']);
        Sanctum::actingAs($manager);

        $this->postJson('/api/committee/tournaments', [
            'name' => 'بطولة ممنوعة',
            'start_date' => '2026-09-01',
            'tournament_format' => 'knockout_only',
            'teams_count' => 8,
            'groups_count' => 1,
            'teams_per_group' => 8,
        ])->assertForbidden();
    }
}
