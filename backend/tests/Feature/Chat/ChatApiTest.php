<?php

namespace Tests\Feature\Chat;

use App\Domains\Chat\Models\MatchChatMessage;
use App\Domains\Chat\Models\MatchChatMute;
use App\Domains\Match\Enums\MatchStatus;
use App\Domains\Match\Models\FootballMatch;
use App\Domains\Player\Models\Player;
use App\Domains\Team\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ChatApiTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;

    private User $user;

    private FootballMatch $match;

    protected function setUp(): void
    {
        parent::setUp();

        $this->manager = User::factory()->approved()->create();
        $this->user = User::factory()->approved()->create(['role' => 'player']);
        $homeTeam = Team::factory()->create(['manager_id' => $this->manager->id]);
        $awayTeam = Team::factory()->create();

        Player::factory()->create([
            'team_id' => $homeTeam->id,
            'user_id' => $this->user->id,
            'status' => Player::STATUS_ACTIVE,
        ]);

        $this->match = FootballMatch::create([
            'home_team_id' => $homeTeam->id,
            'away_team_id' => $awayTeam->id,
            'status' => MatchStatus::FirstHalf,
            'current_minute' => 10,
            'home_score' => 0,
            'away_score' => 0,
            'match_duration_minutes' => 90,
            'kicked_off_at' => now()->subMinutes(10),
            'created_by' => $this->manager->id,
        ]);
    }

    public function test_approved_user_can_send_chat_message(): void
    {
        Sanctum::actingAs($this->user);

        $this->postJson("/api/v1/live/{$this->match->id}/chat", [
            'message' => 'أهلاً بالجميع',
        ])->assertCreated()
            ->assertJsonPath('data.message', 'أهلاً بالجميع')
            ->assertJsonPath('data.user.name', $this->user->name);

        $this->assertDatabaseHas('match_chat_messages', [
            'match_id' => $this->match->id,
            'user_id' => $this->user->id,
        ]);
    }

    public function test_guest_cannot_send_chat_message(): void
    {
        $this->postJson("/api/v1/live/{$this->match->id}/chat", [
            'message' => 'مرحباً',
        ])->assertUnauthorized();
    }

    public function test_authenticated_participant_can_view_chat_history(): void
    {
        MatchChatMessage::query()->create([
            'match_id' => $this->match->id,
            'user_id' => $this->user->id,
            'type' => MatchChatMessage::TYPE_TEXT,
            'message' => 'رسالة موجودة',
        ]);

        Sanctum::actingAs($this->user);

        $this->getJson("/api/v1/live/{$this->match->id}/chat")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.message', 'رسالة موجودة');
    }

    public function test_guest_cannot_view_chat_history(): void
    {
        $this->getJson("/api/v1/live/{$this->match->id}/chat")
            ->assertUnauthorized();
    }

    public function test_non_participant_cannot_view_or_send_messages(): void
    {
        $outsider = User::factory()->approved()->create(['role' => 'player']);
        Sanctum::actingAs($outsider);

        $this->getJson("/api/v1/live/{$this->match->id}/chat")
            ->assertForbidden();

        $this->postJson("/api/v1/live/{$this->match->id}/chat", [
            'message' => 'اقتحام',
        ])->assertForbidden();
    }

    public function test_manager_can_send_announcement(): void
    {
        Sanctum::actingAs($this->manager);

        $this->postJson("/api/v1/live/{$this->match->id}/chat/announcement", [
            'message' => 'إعلان رسمي',
        ])->assertCreated()
            ->assertJsonPath('data.type', MatchChatMessage::TYPE_ANNOUNCEMENT);
    }

    public function test_non_manager_cannot_send_announcement(): void
    {
        Sanctum::actingAs($this->user);

        $this->postJson("/api/v1/live/{$this->match->id}/chat/announcement", [
            'message' => 'إعلان مزيف',
        ])->assertForbidden();
    }

    public function test_muted_user_cannot_send_message(): void
    {
        $this->user->fresh();

        MatchChatMute::query()->create([
            'match_id' => $this->match->id,
            'user_id' => $this->user->id,
            'muted_until' => now()->addHour(),
        ]);

        Sanctum::actingAs($this->user);

        $this->postJson("/api/v1/live/{$this->match->id}/chat", [
            'message' => 'مسموع لي؟',
        ])->assertForbidden();
    }

    public function test_user_can_mute_and_read_status(): void
    {
        Sanctum::actingAs($this->user);

        $this->postJson("/api/v1/live/{$this->match->id}/chat/mute", [
            'minutes' => 30,
        ])->assertOk()
            ->assertJsonPath('muted', true);

        $this->postJson("/api/v1/live/{$this->match->id}/chat/read", [
            'last_read_message_id' => 1,
        ])->assertOk()
            ->assertJsonStructure(['unread_count', 'last_message_id']);
    }

    public function test_owner_can_edit_own_message(): void
    {
        $message = MatchChatMessage::query()->create([
            'match_id' => $this->match->id,
            'user_id' => $this->user->id,
            'type' => MatchChatMessage::TYPE_TEXT,
            'message' => 'قبل التعديل',
        ]);

        Sanctum::actingAs($this->user);

        $this->putJson("/api/v1/chat/messages/{$message->id}", [
            'message' => 'بعد التعديل',
        ])->assertOk()
            ->assertJsonPath('data.message', 'بعد التعديل')
            ->assertJsonPath('data.is_edited', true);
    }

    public function test_other_user_cannot_edit_message(): void
    {
        $message = MatchChatMessage::query()->create([
            'match_id' => $this->match->id,
            'user_id' => $this->manager->id,
            'type' => MatchChatMessage::TYPE_TEXT,
            'message' => 'رسالة المدير',
        ]);

        Sanctum::actingAs($this->user);

        $this->putJson("/api/v1/chat/messages/{$message->id}", [
            'message' => 'محاولة تعديل',
        ])->assertForbidden();
    }
}
