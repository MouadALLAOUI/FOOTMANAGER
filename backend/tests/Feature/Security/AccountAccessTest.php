<?php

namespace Tests\Feature\Security;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_blocking_a_manager_revokes_active_tokens(): void
    {
        $manager = User::factory()->approved()->create();
        $admin = User::factory()->approved()->create(['role' => 'admin']);

        $manager->createToken('auth_token');

        $this->assertDatabaseCount('personal_access_tokens', 1);

        Sanctum::actingAs($admin);

        $this->putJson("/api/admin/managers/{$manager->id}/block")
            ->assertOk()
            ->assertJsonPath('user.status', 'blocked');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_blocked_user_token_no_longer_authenticates(): void
    {
        $manager = User::factory()->approved()->create();
        $token = $manager->createToken('auth_token')->plainTextToken;

        $manager->update(['status' => 'blocked']);
        $manager->revokeTokens();

        $this->getJson('/api/me', ['Authorization' => 'Bearer '.$token])
            ->assertUnauthorized();
    }

    public function test_pending_user_cannot_access_approved_only_endpoint(): void
    {
        $pending = User::factory()->pending()->create(['role' => 'player']);

        Sanctum::actingAs($pending);

        $this->getJson('/api/notifications')
            ->assertForbidden();
    }

    public function test_pending_user_can_still_read_own_profile(): void
    {
        $pending = User::factory()->pending()->create(['role' => 'manager']);

        Sanctum::actingAs($pending);

        $this->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user.status', 'pending');
    }
}
