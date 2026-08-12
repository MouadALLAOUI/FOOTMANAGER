<?php

namespace Tests\Feature\Social;

use App\Domains\Player\Models\Player;
use App\Domains\Social\Models\Activity;
use App\Domains\Social\Models\Comment;
use App\Domains\Stadium\Models\Stadium;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SocialFeaturesTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private User $user;

    private Team $team;

    private Stadium $stadium;

    protected function setUp(): void
    {
        parent::setUp();

        $this->manager = User::factory()->approved()->create();
        $this->user = User::factory()->approved()->create(['role' => 'player']);
        $this->team = Team::factory()->create(['manager_id' => $this->manager->id]);
        $this->stadium = Stadium::factory()->create(['owner_id' => $this->manager->id]);
    }

    public function test_creating_a_team_records_feed_activity(): void
    {
        $this->assertDatabaseHas('activities', [
            'type' => Activity::TYPE_TEAM_CREATED,
            'subject_type' => $this->team->getMorphClass(),
            'subject_id' => $this->team->id,
        ]);
    }

    public function test_public_feed_lists_activities(): void
    {
        $this->getJson('/api/v1/feed')
            ->assertOk()
            ->assertJsonPath('data.0.type', Activity::TYPE_TEAM_CREATED);
    }

    public function test_team_page_returns_squad_and_stats(): void
    {
        Player::factory()->create([
            'team_id' => $this->team->id,
            'status' => Player::STATUS_ACTIVE,
        ]);

        $this->getJson("/api/v1/teams/{$this->team->id}/page")
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'team' => ['id', 'name'],
                    'stats',
                    'squad',
                    'upcoming_matches',
                    'recent_matches',
                    'announcements',
                    'gallery',
                    'is_following',
                    'is_favorite',
                ],
            ])
            ->assertJsonPath('data.team.name', $this->team->name)
            ->assertJsonCount(1, 'data.squad');
    }

    public function test_approved_user_can_comment_on_team(): void
    {
        Sanctum::actingAs($this->user);

        $this->postJson('/api/v1/social/comments', [
            'commentable_type' => 'team',
            'commentable_id' => $this->team->id,
            'body' => 'فريق رائع!',
        ])->assertCreated()
            ->assertJsonPath('data.body', 'فريق رائع!')
            ->assertJsonPath('data.user.name', $this->user->name);

        $this->getJson('/api/v1/comments?commentable_type=team&commentable_id='.$this->team->id)
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_pending_user_cannot_comment(): void
    {
        Sanctum::actingAs(User::factory()->pending()->create());

        $this->postJson('/api/v1/social/comments', [
            'commentable_type' => 'team',
            'commentable_id' => $this->team->id,
            'body' => 'مرحباً',
        ])->assertForbidden();
    }

    public function test_user_can_reply_and_like_comment(): void
    {
        Sanctum::actingAs($this->user);

        $comment = Comment::query()->create([
            'user_id' => $this->manager->id,
            'commentable_type' => $this->team->getMorphClass(),
            'commentable_id' => $this->team->id,
            'body' => 'الأصل',
        ]);

        $this->postJson("/api/v1/social/comments/{$comment->id}/reply", [
            'body' => 'رد تعليق',
        ])->assertCreated()
            ->assertJsonPath('data.body', 'رد تعليق');

        $this->postJson("/api/v1/social/comments/{$comment->id}/like")
            ->assertOk()
            ->assertJsonPath('data.likes_count', 1)
            ->assertJsonPath('data.liked_by_me', true);
    }

    public function test_user_can_follow_and_unfollow_team(): void
    {
        Sanctum::actingAs($this->user);

        $this->postJson('/api/v1/social/follow', [
            'target_type' => 'team',
            'target_id' => $this->team->id,
        ])->assertOk()
            ->assertJsonPath('data.following', true)
            ->assertJsonPath('data.followers_count', 1);

        $this->assertDatabaseHas('follows', [
            'follower_id' => $this->user->id,
            'followable_id' => $this->team->id,
        ]);

        $this->deleteJson("/api/v1/social/follow/team/{$this->team->id}")
            ->assertOk()
            ->assertJsonPath('data.following', false);
    }

    public function test_following_a_team_notifies_the_manager(): void
    {
        Sanctum::actingAs($this->user);

        $this->postJson('/api/v1/social/follow', [
            'target_type' => 'team',
            'target_id' => $this->team->id,
        ])->assertOk();

        $this->assertDatabaseHas('app_notifications', [
            'user_id' => $this->manager->id,
            'type' => 'new_follower',
        ]);
    }

    public function test_user_can_favorite_and_unfavorite_stadium(): void
    {
        Sanctum::actingAs($this->user);

        $this->postJson('/api/v1/social/favorites', [
            'target_type' => 'stadium',
            'target_id' => $this->stadium->id,
        ])->assertOk()
            ->assertJsonPath('data.is_favorite', true);

        $this->assertDatabaseHas('favorites', [
            'user_id' => $this->user->id,
            'favoritable_id' => $this->stadium->id,
        ]);

        $this->deleteJson("/api/v1/social/favorites/stadium/{$this->stadium->id}")
            ->assertOk()
            ->assertJsonPath('data.is_favorite', false);
    }

    public function test_search_requires_auth_and_returns_results(): void
    {
        Sanctum::actingAs($this->user);

        $this->getJson('/api/v1/social/search?q='.urlencode($this->team->name))
            ->assertOk()
            ->assertJsonStructure(['data' => ['teams', 'players', 'stadiums']]);
    }
}
